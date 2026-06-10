// ─────────────────────────────────────────────────────────────────────────────
// Servicio de pedidos
// Todas las funciones que escriben datos usan createServiceClient()
// y deben llamarse solo desde Server Actions o API Routes.
// ─────────────────────────────────────────────────────────────────────────────

import { createServiceClient, supabase } from '@/lib/supabase'
import { sendOrderNotification } from '@/lib/notifications'
import type {
  BundleRow,
  OrderRow,
  OrderItemRow,
  CustomerRow,
  PaymentMethod,
} from '@/types/database.types'

// ─── Tipos de entrada/salida ─────────────────────────────────────────────────

export interface CreateOrderInput {
  customerData: {
    fullName: string
    phone: string
    email?: string
    address: string
    postalCode: string
    city: string
    province: string
  }
  bundleId: number
  paymentMethod: PaymentMethod
  stripePaymentIntentId?: string
  customerNotes?: string
}

export interface CreateOrderResult {
  success: boolean
  orderNumber?: string
  orderId?: string
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// createOrder
// Flujo: upsert customer → generate_order_number → insert order → insert order_item
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  let db: ReturnType<typeof createServiceClient>
  try {
    db = createServiceClient()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[createOrder] createServiceClient falló:', msg)
    return { success: false, error: `Cliente Supabase no inicializado: ${msg}` }
  }

  // ── 1. Obtener bundle ────────────────────────────────────────────────────
  const { data: bundleRaw, error: bundleError } = await db
    .from('bundles')
    .select('id, name, price, product_id, products(id, title)')
    .eq('id', input.bundleId)
    .eq('active', true)
    .single()

  if (bundleError || !bundleRaw) {
    console.error('[createOrder] Error al obtener bundle:', bundleError)
    return {
      success: false,
      error: `Bundle no encontrado. Supabase: ${bundleError?.message} | code: ${bundleError?.code} | hint: ${bundleError?.hint}`,
    }
  }

  const bundle = bundleRaw as unknown as BundleRow & { products: { id: number; title: string } | null }
  const product = bundle.products

  // ── 2. Upsert cliente ────────────────────────────────────────────────────
  const { data: existingRaw } = await db
    .from('customers')
    .select('id')
    .eq('phone', input.customerData.phone)
    .maybeSingle()

  const existing = existingRaw as Pick<CustomerRow, 'id'> | null
  let customerId: number

  if (existing) {
    customerId = existing.id
    await db
      .from('customers')
      .update({
        full_name:   input.customerData.fullName,
        ...(input.customerData.email ? { email: input.customerData.email } : {}),
        address:     input.customerData.address,
        postal_code: input.customerData.postalCode,
        city:        input.customerData.city,
        province:    input.customerData.province,
      })
      .eq('id', customerId)
  } else {
    const { data: newCustomerRaw, error: customerError } = await db
      .from('customers')
      .insert({
        full_name:   input.customerData.fullName,
        phone:       input.customerData.phone,
        email:       input.customerData.email ?? null,
        address:     input.customerData.address,
        postal_code: input.customerData.postalCode,
        city:        input.customerData.city,
        province:    input.customerData.province,
        country:     'España',
      })
      .select('id')
      .single()

    if (customerError || !newCustomerRaw) {
      console.error('[createOrder] Error al insertar customer:', customerError)
      return {
        success: false,
        error: `Error al registrar el cliente. Supabase: ${customerError?.message} | code: ${customerError?.code} | hint: ${customerError?.hint}`,
      }
    }

    customerId = (newCustomerRaw as Pick<CustomerRow, 'id'>).id
  }

  // ── 3. Generar número de pedido ──────────────────────────────────────────
  const { data: orderNumber, error: numberError } = await db
    .rpc('generate_order_number')

  if (numberError || !orderNumber) {
    console.error('[createOrder] Error en generate_order_number:', numberError)
    return {
      success: false,
      error: `Error al generar número de pedido. Supabase: ${numberError?.message} | code: ${numberError?.code} | hint: ${numberError?.hint}`,
    }
  }

  // ── 4. Insertar pedido ───────────────────────────────────────────────────
  const { data: orderRaw, error: orderError } = await db
    .from('orders')
    .insert({
      order_number:              orderNumber as string,
      customer_id:               customerId,
      shipping_name:             input.customerData.fullName,
      shipping_phone:            input.customerData.phone,
      shipping_address:          input.customerData.address,
      shipping_postal:           input.customerData.postalCode,
      shipping_city:             input.customerData.city,
      shipping_province:         input.customerData.province,
      shipping_country:          'España',
      subtotal:                  bundle.price,
      shipping_cost:             0,
      total:                     bundle.price,
      payment_method:            input.paymentMethod,
      payment_status:            'PENDING',
      paid_at:                   null,
      stripe_payment_intent_id:  input.stripePaymentIntentId ?? null,
      status:                    'PENDING',
      customer_notes:            input.customerNotes ?? null,
      admin_notes:               null,
    })
    .select('id')
    .single()

  if (orderError || !orderRaw) {
    console.error('[createOrder] Error al insertar order:', orderError)
    return {
      success: false,
      error: `Error al crear el pedido. Supabase: ${orderError?.message} | code: ${orderError?.code} | hint: ${orderError?.hint}`,
    }
  }

  const orderId = (orderRaw as Pick<OrderRow, 'id'>).id

  // ── 5. Insertar línea de pedido ──────────────────────────────────────────
  const { error: itemError } = await db
    .from('order_items')
    .insert({
      order_id:      orderId,
      product_id:    product?.id ?? null,
      product_title: product?.title ?? 'Gominolas de vinagre de manzana',
      bundle_id:     bundle.id,
      bundle_name:   bundle.name,
      quantity:      1,
      unit_price:    bundle.price,
      discount:      0,
      subtotal:      bundle.price,
    })

  if (itemError) {
    console.error('[createOrder] Error al insertar order_item:', itemError)
  }

  // ── 6. Notificación ntfy (solo COD; CARD se notifica desde el webhook) ─
  if (input.paymentMethod === 'COD') {
    // Fire-and-forget — no awaited para no bloquear la respuesta al cliente
    sendOrderNotification({
      orderNumber:   orderNumber as string,
      customerName:  input.customerData.fullName,
      customerPhone: input.customerData.phone,
      customerEmail: input.customerData.email,
      address:       input.customerData.address,
      city:          input.customerData.city,
      province:      input.customerData.province,
      bundleName:    bundle.name,
      totalEuros:    Number(bundle.price),
      paymentMethod: 'COD',
      status:        'new',
    }).catch((e) => console.error('[createOrder] ntfy COD error:', e))
  }

  return { success: true, orderNumber: orderNumber as string, orderId }
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrderByNumber
// Lectura pública del pedido + ítems (para página de confirmación)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderWithItems extends OrderRow {
  order_items: Pick<OrderItemRow, 'id' | 'product_title' | 'bundle_name' | 'quantity' | 'unit_price' | 'subtotal'>[]
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_title,
        bundle_name,
        quantity,
        unit_price,
        subtotal
      )
    `)
    .eq('order_number', orderNumber)
    .single()

  if (error || !data) return null

  return data as unknown as OrderWithItems
}

// ─────────────────────────────────────────────────────────────────────────────
// updateOrderPaymentStatus
// Llamar desde el webhook de Stripe al confirmar/fallar un pago
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderPaymentStatus(
  stripePaymentIntentId: string,
  status: 'PAID' | 'FAILED'
): Promise<boolean> {
  const db = createServiceClient()

  const { error } = await db
    .from('orders')
    .update({
      payment_status: status,
      paid_at:        status === 'PAID' ? new Date().toISOString() : null,
      status:         status === 'PAID' ? ('CONFIRMED' as const) : ('PENDING' as const),
    })
    .eq('stripe_payment_intent_id', stripePaymentIntentId)

  if (error) {
    console.error('[updateOrderPaymentStatus]', error)
    return false
  }

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrderByStripePaymentIntentId
// Usado por el webhook para obtener datos completos del pedido antes de notificar
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderByStripePaymentIntentId(
  stripePaymentIntentId: string
): Promise<OrderWithItems | null> {
  const db = createServiceClient()

  const { data, error } = await db
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_title,
        bundle_name,
        quantity,
        unit_price,
        subtotal
      )
    `)
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .single()

  if (error || !data) return null

  return data as unknown as OrderWithItems
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO: funciones adicionales para el panel de administración
// ─────────────────────────────────────────────────────────────────────────────

// export async function listOrders(filters?: { status?: OrderStatus; page?: number }) { ... }
// export async function updateOrderStatus(orderId: string, status: OrderStatus) { ... }
// export async function getOrderStats() { ... }
