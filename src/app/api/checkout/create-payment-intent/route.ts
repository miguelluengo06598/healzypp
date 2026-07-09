import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
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
        id: z.string().uuid(),
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
 * Precio verificado en servidor para un item del carrito, leído de Supabase
 * (products/bundles reales) — nunca del precio que envía el cliente.
 *
 * - Sin bundle (attributes vacío): precio_individual × quantity.
 * - Con bundle (attributes[0] = "N Bote(s)"): se extrae la cantidad (N) del
 *   texto y se busca el bundle real por product_id + cantidad — cantidad es
 *   un dato numérico estable, más robusto que comparar bundles.nombre como
 *   string exacto (el texto podría reformularse sin que este endpoint se entere).
 * - Si no hay match real para el bundle solicitado, se devuelve un error
 *   explícito: nunca se cae a un precio inventado o desincronizado.
 */
async function getVerifiedItemPrice(
  db: ReturnType<typeof createServiceClient>,
  productId: string,
  attributes: string[],
  quantity: number
): Promise<
  | { ok: true; unitPriceEur: number; discountEur: number; totalEur: number; title: string }
  | { ok: false; error: string }
> {
  const { data: product, error: productError } = await db
    .from("products")
    .select("id, nombre, precio, activo")
    .eq("id", productId)
    .eq("activo", true)
    .maybeSingle()

  if (productError || !product) {
    return { ok: false, error: `Producto ${productId} no encontrado.` }
  }

  // Sin bundle: precio individual real, sin descuento adicional
  // (products.precio ya es el precio de venta final).
  if (attributes.length === 0) {
    const unitPriceEur = Number(product.precio)
    return {
      ok: true,
      unitPriceEur,
      discountEur: 0,
      totalEur: unitPriceEur * quantity,
      title: product.nombre,
    }
  }

  // Con bundle: extraer la cantidad del texto ("2 Botes" → 2) y buscar el
  // bundle real por product_id + cantidad.
  const qtyMatch = attributes[0]?.match(/^(\d+)/)
  const requestedQty = qtyMatch ? Number(qtyMatch[1]) : null

  if (requestedQty == null) {
    return {
      ok: false,
      error: `Bundle "${attributes[0]}" no reconocido para el producto ${productId}.`,
    }
  }

  const { data: bundle, error: bundleError } = await db
    .from("bundles")
    .select("id, cantidad, precio, ahorro")
    .eq("product_id", productId)
    .eq("cantidad", requestedQty)
    .eq("activo", true)
    .maybeSingle()

  if (bundleError || !bundle) {
    return {
      ok: false,
      error: `Bundle "${attributes[0]}" no existe para el producto ${productId}.`,
    }
  }

  const unitPriceEur = Number(bundle.precio)
  const discountEur = bundle.ahorro != null ? Number(bundle.ahorro) : 0

  return {
    ok: true,
    unitPriceEur,
    discountEur,
    totalEur: unitPriceEur * quantity,
    title: product.nombre,
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

  // Server-verify all product/bundle prices contra Supabase real
  const db = createServiceClient()

  const verifiedItems: Array<{
    productId: string
    productTitle: string
    quantity: number
    unitPriceEur: number
    discountEur: number
  }> = []

  let subtotalEur = 0

  for (const item of items) {
    const verified = await getVerifiedItemPrice(db, item.id, item.attributes, item.quantity)
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 })
    }
    verifiedItems.push({
      productId: item.id,
      productTitle: verified.title,
      quantity: item.quantity,
      unitPriceEur: verified.unitPriceEur,
      discountEur: verified.discountEur,
    })
    subtotalEur += verified.totalEur
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
