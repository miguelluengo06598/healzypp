import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { BUNDLES } from "@/lib/bundles"
import { SHIPPING_OPTIONS, FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/shipping"
import { createCheckoutOrder, attachPaymentIntent } from "@/lib/db/checkout-orders"
import { paymentIntentRatelimit, getClientIp } from "@/lib/rate-limit"
import { getCurrentUserId } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase"
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
 * Server-verified price para un item del carrito, contra los datos reales de
 * Supabase (bundles/products) — nunca contra el catálogo mock ni un precio
 * enviado por el cliente.
 *
 * La tienda solo vende un producto real en 3 tamaños de bundle. El `id` del
 * item del carrito viene del catálogo mock (legacy, sin correspondencia con
 * el UUID real de Supabase), así que el único dato fiable para identificar
 * QUÉ se está comprando es el nombre del bundle en `attributes[0]` (p.ej.
 * "2 Botes"), que se traduce a `cantidad` en la tabla `bundles` real.
 */
async function getVerifiedItemPrice(
  db: ReturnType<typeof createServiceClient>,
  attributes: string[],
  quantity: number
): Promise<{
  unitPriceEur: number
  discountEur: number
  totalEur: number
  title: string
  productId: string
  unidadesStock: number
  stockDisponible: number
} | null> {
  const bundleName = attributes[0]
  const mockBundle = BUNDLES.find((b) => b.name === bundleName)
  if (!mockBundle) return null

  const { data: bundleRow, error: bundleError } = await db
    .from("bundles")
    .select("id, product_id, cantidad, precio, activo")
    .eq("cantidad", mockBundle.id)
    .eq("activo", true)
    .maybeSingle()

  if (bundleError) {
    console.error("[checkout/create-payment-intent] error consultando bundle:", bundleError.message)
    return null
  }
  if (!bundleRow) return null

  const { data: productRow, error: productError } = await db
    .from("products")
    .select("id, nombre, precio, activo, stock")
    .eq("id", bundleRow.product_id)
    .eq("activo", true)
    .maybeSingle()

  if (productError) {
    console.error("[checkout/create-payment-intent] error consultando producto:", productError.message)
    return null
  }
  if (!productRow) return null

  const unitPriceEur = Number(bundleRow.precio)
  return {
    unitPriceEur,
    discountEur: 0,
    totalEur: unitPriceEur * quantity,
    title: `${productRow.nombre} — ${mockBundle.name}`,
    productId: productRow.id,
    unidadesStock: bundleRow.cantidad * quantity,
    stockDisponible: productRow.stock,
  }
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req)
  const { success: allowed } = await paymentIntentRatelimit.limit(ip)
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

  // Server-verify all product prices contra Supabase — sin fallback al precio
  // del frontend si algún item no coincide con un bundle/producto real
  let db: ReturnType<typeof createServiceClient>
  try {
    db = createServiceClient()
  } catch (e) {
    console.error("[checkout/create-payment-intent] Supabase no inicializado:", e)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }

  const verifiedItems: Array<{
    productId: number
    productTitle: string
    quantity: number
    unitPriceEur: number
    discountEur: number
    unidadesStock: number
  }> = []

  let subtotalEur = 0

  // Stock necesario acumulado por producto real (UUID de Supabase), para
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
      productId: item.id,
      productTitle: verified.title,
      quantity: item.quantity,
      unitPriceEur: verified.unitPriceEur,
      discountEur: verified.discountEur,
      unidadesStock: verified.unidadesStock,
    })
    subtotalEur += verified.totalEur

    stockNeededByProduct.set(
      verified.productId,
      (stockNeededByProduct.get(verified.productId) ?? 0) + verified.unidadesStock
    )
    stockAvailableByProduct.set(verified.productId, verified.stockDisponible)
  }

  // ── Comprobación de stock (sin bloqueo) antes de crear pedido/PaymentIntent ──
  for (const [productId, needed] of stockNeededByProduct) {
    const available = stockAvailableByProduct.get(productId) ?? 0
    if (available < needed) {
      return NextResponse.json(
        { error: "No hay stock suficiente para completar este pedido." },
        { status: 400 }
      )
    }
  }

  // Calculate shipping (free if subtotal >= threshold)
  const shippingCostEur =
    shippingMethodId === "standard" && subtotalEur >= FREE_SHIPPING_THRESHOLD_EUR
      ? 0
      : shippingOption.basePrice

  // W3: Revalidar cupón en servidor — nunca confiar en el importe del cliente
  let safeCouponDiscount = 0
  if (couponCode) {
    try {
      const db = createServiceClient()
      const { data: couponData } = await (db as any)
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('active', true)
        .maybeSingle()

      if (couponData) {
        const isExpired = couponData.expires_at && new Date(couponData.expires_at) < new Date()
        const isMaxed = couponData.max_uses !== null && couponData.current_uses >= couponData.max_uses
        const meetsMin = couponData.minimum_order_eur === null || subtotalEur >= couponData.minimum_order_eur

        if (!isExpired && !isMaxed && meetsMin) {
          safeCouponDiscount = couponData.type === 'fixed'
            ? Math.min(couponData.value, subtotalEur)
            : Math.round(subtotalEur * couponData.value / 100 * 100) / 100
        }
      }
    } catch (err) {
      console.warn('[checkout/create-payment-intent] coupon validation error:', err)
    }
  }

  const totalEur = Math.max(0, subtotalEur - safeCouponDiscount + shippingCostEur)
  const totalCents = Math.round(totalEur * 100)

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
