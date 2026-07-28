// ─────────────────────────────────────────────────────────────────────────────
// Servicio de pedidos
// Todas las funciones que escriben datos usan createServiceClient()
// y deben llamarse solo desde Server Actions o API Routes.
// ─────────────────────────────────────────────────────────────────────────────

import { createServiceClient } from '@/lib/supabase'
import { findBundleBySku } from '@/data/catalog'
import type {
  OrderRow,
  OrderItemRow,
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
  /** Identificador único del pack en el catálogo (ver src/data/catalog.ts).
   *  Antes era un `bundleId` numérico que se resolvía con la primera
   *  coincidencia del catálogo, así que con más de un producto podía apuntar
   *  al pack equivocado. */
  sku: string
  bundlePriceInCents?: number
  paymentMethod: PaymentMethod
  stripePaymentIntentId?: string
  customerNotes?: string
  userId?: string
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

  try {
  // ── 1. Resolver bundle/producto — 100% desde el catálogo en código
  // (src/data/catalog.ts), nunca desde Supabase. A diferencia de la
  // versión anterior (que consultaba bundles/products en Supabase y podía
  // no encontrar la fila, de ahí el fallback a BUNDLES/precio del
  // cliente), esta búsqueda es en memoria y no puede fallar por red — solo
  // falla si el sku no existe en el catálogo, lo cual es un dato inválido
  // real, no un problema de disponibilidad.
  const resolved = findBundleBySku(input.sku)
  if (!resolved) {
    return { success: false, error: `El bundle solicitado (${input.sku}) no existe en el catálogo.` }
  }
  const { product, bundle } = resolved
  const unitPriceEur = bundle.precio
  const unidadesStock = bundle.cantidad

  const upsertProfile = async (): Promise<string | null> => {
    // Upsert en profiles solo si el usuario está autenticado
    if (!input.userId) return null
    try {
      const nameParts = input.customerData.fullName.trim().split(/\s+/)
      const nombre    = nameParts[0] ?? ''
      const apellidos = nameParts.slice(1).join(' ') || null

      await db
        .from('profiles')
        .upsert({
          id: input.userId,
          nombre,
          ...(apellidos ? { apellidos } : {}),
          telefono: input.customerData.phone,
          email: input.customerData.email ?? null,
        }, { onConflict: 'id' })
      return input.userId
    } catch (err) {
      console.warn('[createOrder] Error en profiles upsert:', err)
      return null
    }
  }

  const [profileId, { data: orderNumber, error: numberError }] =
    await Promise.all([
      upsertProfile(),
      db.rpc('generate_order_number'),
    ])

  if (numberError || !orderNumber) {
    console.error('[createOrder] Error en generate_order_number:', numberError)
    return {
      success: false,
      error: `Error al generar número de pedido. Supabase: ${numberError?.message} | code: ${numberError?.code} | hint: ${numberError?.hint}`,
    }
  }

  // ── 4. Insertar pedido ───────────────────────────────────────────────────
  const direccionEnvio = [
    input.customerData.address,
    input.customerData.postalCode,
    input.customerData.city,
    input.customerData.province,
  ].filter(Boolean).join(', ')

  const { data: orderRaw, error: orderError } = await db
    .from('orders')
    .insert({
      numero_pedido:               orderNumber as string,
      user_id:                     profileId,
      email_cliente:               input.customerData.email ?? null,
      nombre_cliente:              input.customerData.fullName,
      telefono_cliente:            input.customerData.phone,
      estado:                      'pendiente',
      subtotal:                    unitPriceEur,
      descuento:                   0,
      gastos_envio:                0,
      total:                       unitPriceEur,
      metodo_pago:                 input.paymentMethod.toLowerCase(),
      stripe_payment_intent_id:    input.stripePaymentIntentId ?? null,
      cupon_id:                    null,
      direccion_envio:             direccionEnvio,
      notas_cliente:               input.customerNotes ?? null,
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
      order_id:        orderId,
      // product_id (UUID) ya no se rellena — el catálogo vive en código,
      // no en la tabla products. product_slug es el identificador real que
      // usa el webhook para decrementar stock (ver product_stock).
      product_id:      null,
      product_slug:    product.slug,
      variant_id:      null,
      nombre_producto: product.nombre,
      imagen_producto: null,
      cantidad:        1,
      precio_unitario: unitPriceEur,
      precio_total:    unitPriceEur,
      unidades_stock:  unidadesStock,
    })

  if (itemError) {
    console.error('[createOrder] Error al insertar order_item:', itemError)
  }

  // ── 6. Insertar historial de tracking ───────────────────────────────────────
  // 'pendiente' porque el pedido se crea ANTES de confirmar el pago con Stripe
  // (evita el riesgo de "pedido fantasma"); el webhook añade el tracking de
  // 'pagado' cuando payment_intent.succeeded confirma el cobro.
  try {
    await db.from('order_tracking').insert({
      order_id: orderId,
      estado: 'pendiente',
      descripcion: 'Pedido creado, esperando confirmación de pago',
    })
  } catch (err) {
    console.warn('[createOrder] Error al insertar order_tracking:', err)
  }

  // Notificación Pushover: se envía desde el webhook de Stripe al confirmar el pago.

  return { success: true, orderNumber: orderNumber as string, orderId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[createOrder] Error inesperado:', e)
    return { success: false, error: `Error inesperado al procesar el pedido: ${msg}` }
  }
}

export interface OrderWithItems extends OrderRow {
  order_items: Pick<OrderItemRow, 'id' | 'product_id' | 'product_slug' | 'nombre_producto' | 'cantidad' | 'precio_unitario' | 'precio_total' | 'unidades_stock'>[]
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
      estado:              status === 'PAID' ? 'pagado' : 'fallido',
      fecha_actualizacion: new Date().toISOString(),
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
        product_id,
        product_slug,
        nombre_producto,
        cantidad,
        precio_unitario,
        precio_total,
        unidades_stock
      )
    `)
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .single()

  if (error || !data) return null

  return data as unknown as OrderWithItems
}

// ─────────────────────────────────────────────────────────────────────────────
// decrementProductStock
// Decremento atómico — llamar SOLO desde el webhook de Stripe al confirmar
// el pago (payment_intent.succeeded), nunca al crear el PaymentIntent.
// Usa la función Postgres decrement_product_stock (ver database/SETUP-COMPLETO.sql),
// que opera sobre product_stock por slug (no sobre products.id — esa tabla
// está dormante desde la unificación del catálogo en código) y hace
// UPDATE ... WHERE stock >= qty de forma atómica contra race conditions.
// ─────────────────────────────────────────────────────────────────────────────

export async function decrementProductStock(productSlug: string, qty: number): Promise<boolean> {
  if (qty <= 0) return true

  const db = createServiceClient()
  const { data, error } = await db.rpc('decrement_product_stock', {
    p_product_slug: productSlug,
    p_qty: qty,
  })

  if (error) {
    console.error('[decrementProductStock] Error RPC:', error.message)
    return false
  }

  return Boolean(data)
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO: funciones adicionales para el panel de administración
// ─────────────────────────────────────────────────────────────────────────────

// export async function listOrders(filters?: { status?: OrderStatus; page?: number }) { ... }
// export async function updateOrderStatus(orderId: string, status: OrderStatus) { ... }
// export async function getOrderStats() { ... }
