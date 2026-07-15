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
  /** Unidades reales de stock (botes) que consume esta línea — bundle.cantidad × quantity */
  unidadesStock: number
}

export interface CreateCheckoutOrderInput {
  items: CheckoutOrderItem[]
  email: string
  shippingAddress: ShippingAddress
  shippingMethod: ShippingMethod
  subtotalEur: number
  couponDiscountEur: number
  totalEur: number
  userId?: string
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

  // 1. Upsert perfil en profiles solo si el usuario está autenticado
  let profileId: string | null = input.userId ?? null

  if (input.userId) {
    try {
      const nameParts = fullName.trim().split(/\s+/)
      const nombre    = nameParts[0] ?? ''
      const apellidos = nameParts.slice(1).join(' ') || null

      await db
        .from("profiles")
        .upsert({
          id: input.userId,
          nombre,
          ...(apellidos ? { apellidos } : {}),
          telefono: input.shippingAddress.phone,
          email: input.email || null,
        }, { onConflict: 'id' })
    } catch (err) {
      console.warn("[createCheckoutOrder] Error en profiles upsert:", err)
      profileId = null
    }
  }

  // 2. Generate order number
  const { data: orderNumber, error: numErr } = await db.rpc("generate_order_number")
  if (numErr || !orderNumber) {
    return { success: false, error: `Error al generar número de pedido: ${numErr?.message}` }
  }

  const shippingAddressStr = [
    input.shippingAddress.address,
    input.shippingAddress.apartment,
    input.shippingAddress.postalCode,
    input.shippingAddress.city,
    input.shippingAddress.province,
  ].filter(Boolean).join(', ')

  // 3. Insert order (PENDING, no PI yet)
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      numero_pedido:            orderNumber as string,
      user_id:                  profileId,
      email_cliente:            input.email || null,
      nombre_cliente:           fullName,
      telefono_cliente:         input.shippingAddress.phone,
      estado:                   'pendiente',
      subtotal:                 input.subtotalEur,
      descuento:                input.couponDiscountEur,
      gastos_envio:             input.shippingMethod.price,
      total:                    input.totalEur,
      metodo_pago:              'card',
      stripe_payment_intent_id: null,
      cupon_id:                 null,
      direccion_envio:          shippingAddressStr,
      notas_cliente:            input.couponDiscountEur > 0
        ? `descuento_cupon:${input.couponDiscountEur.toFixed(2)}`
        : null,
    })
    .select("id")
    .single()

  if (orderErr || !order) {
    return { success: false, error: `Error al crear pedido: ${orderErr?.message}` }
  }

  const orderId = (order as { id: string }).id

  // 4. Insert order items
  const itemRows = input.items.map((item) => ({
    order_id:        orderId,
    product_id:      item.productId,
    variant_id:      null as number | null,
    nombre_producto: item.productTitle,
    imagen_producto: null as string | null,
    cantidad:        item.quantity,
    precio_unitario: item.unitPriceEur,
    precio_total:    (item.unitPriceEur - item.discountEur) * item.quantity,
    unidades_stock:  item.unidadesStock,
  }))

  const { error: itemsErr } = await db.from("order_items").insert(itemRows)
  if (itemsErr) {
    console.error("[createCheckoutOrder] order_items insert error:", itemsErr.message)
  }

  // 5. Hito de tracking 'pendiente' — paridad con el flujo de bundle único
  // (createOrder en orders.ts). El webhook añade el hito 'pagado' al
  // confirmarse el cobro. No-fatal, mismo patrón que el resto de inserts.
  try {
    await db.from("order_tracking").insert({
      order_id: orderId,
      estado: "pendiente",
      descripcion: "Pedido creado, esperando confirmación de pago",
    })
  } catch (err) {
    console.warn("[createCheckoutOrder] Error al insertar order_tracking:", err)
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
