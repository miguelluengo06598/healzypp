import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { findBundleByNameAcrossCatalog } from "@/data/catalog"
import { SHIPPING_OPTIONS, FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/shipping"
import { createCheckoutOrder, attachPaymentIntent } from "@/lib/db/checkout-orders"
import { paymentIntentRatelimit, getClientIp } from "@/lib/rate-limit"
import { isTrustedOrigin } from "@/lib/security/origin-check"
import { getCurrentUserId } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase"
import { eurosToCents, centsToEuros } from "@/lib/money"
import type { ShippingAddress, ShippingMethod } from "@/hooks/useCheckout"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
})

const ShippingAddressSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s\-]/g, ""))
    .refine((v) => /^(\+34|0034|34)?[6789]\d{8}$/.test(v), "Teléfono español no válido"),
  address: z.string().min(5).max(200).trim(),
  apartment: z.string().max(100).trim().default(""),
  postalCode: z.string().regex(/^\d{5}$/, "Código postal inválido"),
  city: z.string().min(2).max(100).trim(),
  province: z.string().min(2).max(100).trim(),
  country: z.string().min(2).max(100).trim().default("España"),
})

const BodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        quantity: z.number().int().min(1).max(100),
        attributes: z.array(z.string()).default([]),
      })
    )
    .min(1)
    .max(50),
  shippingAddress: ShippingAddressSchema,
  shippingMethodId: z.string().min(1),
  email: z.string().email(),
  couponCode: z.string().max(50).optional(),
  couponDiscountEur: z.number().min(0).max(10000).default(0),
})

/**
 * Precio verificado de un item del carrito — 100% desde el catálogo en
 * código (src/data/catalog.ts), la ÚNICA fuente de precio (mostrar Y
 * cobrar). El único dato que sigue en Supabase es el STOCK real
 * (product_stock, por slug), porque es estado mutable, no contenido.
 *
 * El único dato fiable del item del carrito para identificar QUÉ se está
 * comprando es el nombre del bundle en `attributes[0]` (p.ej. "2 Botes"),
 * que se busca en TODO el catálogo (no un producto fijo) vía
 * findBundleByNameAcrossCatalog.
 */
async function getVerifiedItemPrice(
  db: ReturnType<typeof createServiceClient>,
  attributes: string[],
  quantity: number
): Promise<{
  unitPriceEur: number
  discountEur: number
  title: string
  productSlug: string
  bundleId: number
  unidadesStock: number
  stockDisponible: number
} | null> {
  const bundleName = attributes[0]
  const resolved = findBundleByNameAcrossCatalog(bundleName)
  if (!resolved) return null
  const { product, bundle } = resolved

  const { data: stockRow, error: stockError } = await db
    .from("product_stock")
    .select("stock")
    .eq("product_slug", product.slug)
    .maybeSingle()

  if (stockError) {
    console.error("[checkout/create-payment-intent] error consultando stock:", stockError.message)
    return null
  }

  return {
    unitPriceEur: bundle.precio,
    discountEur: 0,
    title: `${product.nombre} — ${bundle.nombre}`,
    productSlug: product.slug,
    bundleId: bundle.id,
    unidadesStock: bundle.cantidad * quantity,
    stockDisponible: stockRow?.stock ?? 0,
  }
}

/** Compacta los bundleId del carrito para caber en el límite de 500 caracteres
 *  de un valor de metadata de Stripe (ver api/create-payment-intent/route.ts,
 *  que usa el mismo bundleId como content_id en el Purchase de CAPI). Dedupe
 *  porque content_ids identifica QUÉ se compró, no cuántas unidades. */
function buildContentIdsMetadata(bundleIds: number[]): string {
  const unique = Array.from(new Set(bundleIds)).map(String)
  let result = ""
  for (const id of unique) {
    const next = result ? `${result},${id}` : id
    if (next.length > 500) break
    result = next
  }
  return result
}

export async function POST(req: NextRequest) {
  // ── CSRF: rechazar peticiones que no vengan del propio origen ───────────────
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 })
  }

  // Rate limit
  const ip = getClientIp(req)
  // Igual que en api/create-payment-intent/route.ts: si Redis no responde no
  // debe tumbar el checkout, se deja pasar la petición.
  let allowed = true
  try {
    const result = await paymentIntentRatelimit.limit(ip)
    allowed = result.success
  } catch (err) {
    console.error("[ratelimit] Redis error, skipping:", err)
    allowed = true
  }
  if (!allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Inténtalo más tarde." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { items, shippingAddress, shippingMethodId, email, couponCode, couponDiscountEur } = parsed.data

  // Verify shipping method exists
  const shippingOption = SHIPPING_OPTIONS.find((o) => o.id === shippingMethodId)
  if (!shippingOption) {
    return NextResponse.json({ error: "Método de envío no válido." }, { status: 400 })
  }

  // Server-verify todos los precios contra el catálogo en código
  // (src/data/catalog.ts, modelo híbrido) — sin fallback al precio del
  // frontend si algún item no coincide con un bundle/producto real. Supabase
  // solo se consulta aquí para el stock (product_stock), no para el precio.
  let db: ReturnType<typeof createServiceClient>
  try {
    db = createServiceClient()
  } catch (e) {
    console.error("[checkout/create-payment-intent] Supabase no inicializado:", e)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }

  const verifiedItems: Array<{
    productSlug: string
    productTitle: string
    quantity: number
    unitPriceEur: number
    discountEur: number
    unidadesStock: number
  }> = []

  // Bundle ids reales del carrito — se guardan en metadata del PaymentIntent
  // para que el webhook pueda construir content_ids en el Purchase de CAPI
  // (mismo patrón que ya usa el flujo de "comprar 1 bundle" con bundleId).
  const bundleIdsInCart: number[] = []

  // Todo el cálculo monetario en CÉNTIMOS (enteros) — sumar euros float
  // arrastra error binario; el amount de Stripe debe ser un entero limpio.
  let subtotalCents = 0

  // Stock necesario acumulado por producto real (slug de catalog.ts), para
  // soportar varias líneas del carrito que apunten al mismo producto con
  // distintos tamaños de bundle.
  const stockNeededByProduct = new Map<string, number>()
  const stockAvailableByProduct = new Map<string, number>()

  for (const item of items) {
    const verified = await getVerifiedItemPrice(db, item.attributes, item.quantity)
    if (!verified) {
      return NextResponse.json(
        { error: `El artículo ${item.id} no coincide con un producto/bundle real disponible. Pago rechazado.` },
        { status: 400 }
      )
    }
    verifiedItems.push({
      productSlug: verified.productSlug,
      productTitle: verified.title,
      quantity: item.quantity,
      unitPriceEur: verified.unitPriceEur,
      discountEur: verified.discountEur,
      unidadesStock: verified.unidadesStock,
    })
    bundleIdsInCart.push(verified.bundleId)
    subtotalCents += eurosToCents(verified.unitPriceEur) * item.quantity

    stockNeededByProduct.set(
      verified.productSlug,
      (stockNeededByProduct.get(verified.productSlug) ?? 0) + verified.unidadesStock
    )
    stockAvailableByProduct.set(verified.productSlug, verified.stockDisponible)
  }

  // ── Comprobación de stock (sin bloqueo) antes de crear pedido/PaymentIntent ──
  for (const [productSlug, needed] of stockNeededByProduct) {
    const available = stockAvailableByProduct.get(productSlug) ?? 0
    if (available < needed) {
      return NextResponse.json(
        { error: "No hay stock suficiente para completar este pedido." },
        { status: 400 }
      )
    }
  }

  // Calculate shipping (free if subtotal >= threshold)
  const shippingCostCents =
    shippingMethodId === "standard" &&
    subtotalCents >= eurosToCents(FREE_SHIPPING_THRESHOLD_EUR)
      ? 0
      : eurosToCents(shippingOption.basePrice)

  // W3: Revalidar cupón en servidor — nunca confiar en el importe del cliente
  let safeCouponDiscountCents = 0
  if (couponCode) {
    try {
      const db = createServiceClient()
      // Columnas reales de coupons (español) — ver misma corrección en
      // validate-coupon/route.ts. Antes usaba nombres en inglés que nunca
      // existieron en la tabla real; la consulta fallaba siempre y el
      // descuento del cupón se quedaba silenciosamente en 0.
      const { data: couponData } = await (db as any)
        .from('coupons')
        .select('*')
        .eq('codigo', couponCode.toUpperCase())
        .eq('activo', true)
        .maybeSingle()

      if (couponData) {
        const isExpired = couponData.fecha_fin && new Date(couponData.fecha_fin) < new Date()
        const isMaxed = couponData.usos_totales !== null && couponData.usos_actuales >= couponData.usos_totales
        const meetsMin =
          !couponData.minimo_pedido ||
          subtotalCents >= eurosToCents(couponData.minimo_pedido)

        if (!isExpired && !isMaxed && meetsMin) {
          if (couponData.tipo === 'fijo') {
            safeCouponDiscountCents = Math.min(eurosToCents(couponData.valor), subtotalCents)
          } else if (couponData.tipo === 'porcentaje') {
            safeCouponDiscountCents = Math.round(subtotalCents * couponData.valor / 100)
          }
          // 'envio_gratis' no descuenta subtotalCents aquí — ver nota en
          // validate-coupon/route.ts.
        }
      }
    } catch (err) {
      console.warn('[checkout/create-payment-intent] coupon validation error:', err)
    }
  }

  // Enteros de céntimos de punta a punta — totalCents es el amount de Stripe
  const totalCents = Math.max(0, subtotalCents - safeCouponDiscountCents + shippingCostCents)
  const subtotalEur = centsToEuros(subtotalCents)
  const safeCouponDiscount = centsToEuros(safeCouponDiscountCents)
  const shippingCostEur = centsToEuros(shippingCostCents)
  const totalEur = centsToEuros(totalCents)

  if (totalCents < 50) {
    return NextResponse.json({ error: "El importe mínimo del pedido es 0,50€." }, { status: 400 })
  }

  const shippingMethod: ShippingMethod = {
    id: shippingOption.id,
    name: shippingOption.name,
    description: shippingOption.description,
    estimatedDays: shippingOption.estimatedDays,
    price: shippingCostEur,
  }

  try {
    // Create order in DB (PENDING — no PI ID yet)
    const userId = (await getCurrentUserId()) ?? undefined
    const orderResult = await createCheckoutOrder({
      items: verifiedItems,
      email,
      shippingAddress: shippingAddress as ShippingAddress,
      shippingMethod,
      subtotalEur,
      couponDiscountEur: safeCouponDiscount,
      totalEur,
      userId,
    })

    if (!orderResult.success || !orderResult.orderId || !orderResult.orderNumber) {
      console.error("[checkout/create-payment-intent] createCheckoutOrder failed:", orderResult.error)
      return NextResponse.json({ error: "Error al crear el pedido." }, { status: 500 })
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "eur",
      capture_method: "automatic",
      metadata: {
        order_id: orderResult.orderId,
        order_number: orderResult.orderNumber,
        email,
        content_ids: buildContentIdsMetadata(bundleIdsInCart),
      },
    })

    // Link PI to order
    await attachPaymentIntent(orderResult.orderId, paymentIntent.id)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderNumber: orderResult.orderNumber,
      orderId: orderResult.orderId,
      totalEur,
      totalCents,
    })
  } catch (err) {
    console.error("[checkout/create-payment-intent]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}
