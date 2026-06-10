import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { newArrivalsData, topSellingData } from "@/data/products"
import { SHIPPING_OPTIONS, FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/shipping"
import { createCheckoutOrder, attachPaymentIntent } from "@/lib/db/checkout-orders"
import { paymentIntentRatelimit, getClientIp } from "@/lib/rate-limit"
import type { ShippingAddress, ShippingMethod } from "@/hooks/useCheckout"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
})

// Deduplicated static product catalog for server-side price verification
const PRODUCT_CATALOG = [...newArrivalsData, ...topSellingData].filter(
  (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
)

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

/** Server-verified adjusted price for a product */
function getVerifiedItemPrice(
  productId: number,
  quantity: number
): { unitPriceEur: number; discountEur: number; totalEur: number; title: string } | null {
  const product = PRODUCT_CATALOG.find((p) => p.id === productId)
  if (!product) return null

  const basePrice = product.price
  let adjustedPrice = basePrice

  if (product.discount.percentage > 0) {
    adjustedPrice = Math.round(basePrice * (1 - product.discount.percentage / 100))
  } else if (product.discount.amount > 0) {
    adjustedPrice = Math.round(basePrice - product.discount.amount)
  }

  const discountEur = basePrice - adjustedPrice
  return {
    unitPriceEur: adjustedPrice,
    discountEur,
    totalEur: adjustedPrice * quantity,
    title: product.title,
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

  const { items, shippingAddress, shippingMethodId, email, couponDiscountEur } = parsed.data

  // Verify shipping method exists
  const shippingOption = SHIPPING_OPTIONS.find((o) => o.id === shippingMethodId)
  if (!shippingOption) {
    return NextResponse.json({ error: "Método de envío no válido." }, { status: 400 })
  }

  // Server-verify all product prices
  const verifiedItems: Array<{
    productId: number
    productTitle: string
    quantity: number
    unitPriceEur: number
    discountEur: number
  }> = []

  let subtotalEur = 0

  for (const item of items) {
    const verified = getVerifiedItemPrice(item.id, item.quantity)
    if (!verified) {
      return NextResponse.json(
        { error: `Producto ${item.id} no encontrado.` },
        { status: 400 }
      )
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

  // Server-cap coupon discount — never more than subtotal
  const safeCouponDiscount = Math.min(Math.max(0, couponDiscountEur), subtotalEur)

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
    const orderResult = await createCheckoutOrder({
      items: verifiedItems,
      email,
      shippingAddress: shippingAddress as ShippingAddress,
      shippingMethod,
      subtotalEur,
      couponDiscountEur: safeCouponDiscount,
      totalEur,
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
