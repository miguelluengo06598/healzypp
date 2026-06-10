// Server-only: createCheckoutOrder for cart-based orders
// All writes use createServiceClient (bypasses RLS)

import { createServiceClient } from "@/lib/supabase"
import type { ShippingAddress, ShippingMethod } from "@/hooks/useCheckout"

export interface CheckoutOrderItem {
  productId: number | null
  productTitle: string
  quantity: number
  unitPriceEur: number
  discountEur: number
}

export interface CreateCheckoutOrderInput {
  items: CheckoutOrderItem[]
  email: string
  shippingAddress: ShippingAddress
  shippingMethod: ShippingMethod
  subtotalEur: number
  couponDiscountEur: number
  totalEur: number
}

export interface CreateCheckoutOrderResult {
  success: boolean
  orderId?: string
  orderNumber?: string
  error?: string
}

export async function createCheckoutOrder(
  input: CreateCheckoutOrderInput
): Promise<CreateCheckoutOrderResult> {
  let db: ReturnType<typeof createServiceClient>
  try {
    db = createServiceClient()
  } catch (e) {
    return { success: false, error: "Cliente Supabase no inicializado" }
  }

  const fullName = `${input.shippingAddress.firstName} ${input.shippingAddress.lastName}`.trim()

  // 1. Upsert customer by phone
  const { data: existing } = await db
    .from("customers")
    .select("id")
    .eq("phone", input.shippingAddress.phone)
    .maybeSingle()

  let customerId: number

  if (existing) {
    customerId = (existing as { id: number }).id
    await db
      .from("customers")
      .update({
        full_name: fullName,
        email: input.email,
        address: input.shippingAddress.address,
        postal_code: input.shippingAddress.postalCode,
        city: input.shippingAddress.city,
        province: input.shippingAddress.province,
      })
      .eq("id", customerId)
  } else {
    const { data: newCustomer, error: customerErr } = await db
      .from("customers")
      .insert({
        full_name: fullName,
        phone: input.shippingAddress.phone,
        email: input.email,
        address: input.shippingAddress.address,
        postal_code: input.shippingAddress.postalCode,
        city: input.shippingAddress.city,
        province: input.shippingAddress.province,
        country: input.shippingAddress.country,
      })
      .select("id")
      .single()

    if (customerErr || !newCustomer) {
      return { success: false, error: `Error al registrar cliente: ${customerErr?.message}` }
    }
    customerId = (newCustomer as { id: number }).id
  }

  // 2. Generate order number
  const { data: orderNumber, error: numErr } = await db.rpc("generate_order_number")
  if (numErr || !orderNumber) {
    return { success: false, error: `Error al generar número de pedido: ${numErr?.message}` }
  }

  const shippingAddressStr =
    input.shippingAddress.address +
    (input.shippingAddress.apartment ? `, ${input.shippingAddress.apartment}` : "")

  // 3. Insert order (PENDING, no PI yet)
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      order_number: orderNumber as string,
      customer_id: customerId,
      shipping_name: fullName,
      shipping_phone: input.shippingAddress.phone,
      shipping_address: shippingAddressStr,
      shipping_postal: input.shippingAddress.postalCode,
      shipping_city: input.shippingAddress.city,
      shipping_province: input.shippingAddress.province,
      shipping_country: input.shippingAddress.country,
      subtotal: input.subtotalEur,
      shipping_cost: input.shippingMethod.price,
      total: input.totalEur,
      payment_method: "CARD" as const,
      payment_status: "PENDING" as const,
      paid_at: null,
      stripe_payment_intent_id: null,
      stripe_client_secret: null,
      status: "PENDING" as const,
      customer_notes: input.couponDiscountEur > 0
        ? `descuento_cupon:${input.couponDiscountEur.toFixed(2)}`
        : null,
      admin_notes: null,
    })
    .select("id")
    .single()

  if (orderErr || !order) {
    return { success: false, error: `Error al crear pedido: ${orderErr?.message}` }
  }

  const orderId = (order as { id: string }).id

  // 4. Insert order items
  const itemRows = input.items.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    product_title: item.productTitle,
    bundle_id: null as number | null,
    bundle_name: "",
    quantity: item.quantity,
    unit_price: item.unitPriceEur,
    discount: item.discountEur,
    subtotal: (item.unitPriceEur - item.discountEur) * item.quantity,
  }))

  const { error: itemsErr } = await db.from("order_items").insert(itemRows)
  if (itemsErr) {
    console.error("[createCheckoutOrder] order_items insert error:", itemsErr.message)
  }

  return { success: true, orderId, orderNumber: orderNumber as string }
}

/** Sets stripe_payment_intent_id on an existing order */
export async function attachPaymentIntent(
  orderId: string,
  stripePaymentIntentId: string
): Promise<void> {
  const db = createServiceClient()
  await db
    .from("orders")
    .update({ stripe_payment_intent_id: stripePaymentIntentId })
    .eq("id", orderId)
}
