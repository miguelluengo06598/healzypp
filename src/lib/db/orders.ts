// ─────────────────────────────────────────────────────────────────────────────
// Servicio de pedidos
// Todas las funciones que escriben datos usan createServiceClient()
// y deben llamarse solo desde Server Actions o API Routes.
// ─────────────────────────────────────────────────────────────────────────────

import { createServiceClient, supabase } from '@/lib/supabase'
import { BUNDLES } from '@/lib/bundles'
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
  bundleId: number
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
  // ── 1. Obtener bundle ────────────────────────────────────────────────────
  let bundle: {
    id: number
    name: string
    price: number
    product_id: number | null
    cantidad: number
  } | null = null

  try {
    const { data: bundleRaw, error: bundleError } = await db
      .from('bundles')
      .select('id, product_id, nombre, cantidad, precio, precio_original, ahorro, porcentaje_dto, precio_por_unidad, es_popular, orden, activo')
      .eq('id', input.bundleId)
      .eq('activo', true)
      .single()

    if (!bundleError && bundleRaw) {
      const raw = bundleRaw as any
      bundle = {
        id: raw.id,
        name: raw.nombre ?? 'Bundle',
        price: Number(raw.precio ?? 0),
        product_id: raw.product_id ?? null,
        cantidad: Number(raw.cantidad ?? input.bundleId),
      }
    } else if (bundleError) {
      console.warn('[createOrder] No se pudo leer bundle:', bundleError.message)
    }
  } catch (err) {
    console.warn('[createOrder] No se pudo leer bundle:', err)
  }

  // Intentar leer el producto asociado de forma aislada (la tabla puede tener columnas distintas)
  let product: { id: number; title: string } | null = null
  if (bundle?.product_id) {
    try {
      const { data: productRaw, error: productError } = await db
        .from('products')
        .select('id, nombre')
        .eq('id', bundle.product_id)
        .single()
      if (!productError && productRaw) {
        const raw = productRaw as any
        product = {
          id: raw.id,
          title: raw.nombre ?? 'Gominolas de vinagre de manzana',
        }
      }
    } catch (err) {
      console.warn('[createOrder] No se pudo leer producto:', err)
    }
  }

  // Si Supabase no respondió, usar datos locales o el precio que envió el cliente
  let unitPriceEur: number
  let bundleName: string
  let unidadesStock: number
  if (bundle) {
    unitPriceEur = bundle.price
    bundleName = bundle.name
    unidadesStock = bundle.cantidad
  } else {
    console.warn('[createOrder] Bundle no encontrado en Supabase, usando datos locales')
    const localBundle = BUNDLES.find(b => b.id === input.bundleId)
    const clientPriceEur =
      typeof input.bundlePriceInCents === 'number' && input.bundlePriceInCents >= 0
        ? input.bundlePriceInCents / 100
        : null
    unitPriceEur = clientPriceEur ?? (localBundle ? localBundle.priceInCents / 100 : 0)
    bundleName = localBundle?.name ?? 'Bundle desconocido'
    unidadesStock = localBundle?.id ?? input.bundleId
  }

  // ── 2. Upsert perfil en profiles solo si el usuario está autenticado ─
  let profileId: string | null = input.userId ?? null

  if (input.userId) {
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
    } catch (err) {
      console.warn('[createOrder] Error en profiles upsert:', err)
      profileId = null
    }
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
      product_id:      product?.id ?? null,
      variant_id:      null,
      nombre_producto: product?.title ?? 'Gominolas de vinagre de manzana',
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

// ─────────────────────────────────────────────────────────────────────────────
// getOrderByNumber
// Lectura pública del pedido + ítems (para página de confirmación)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderWithItems extends OrderRow {
  order_items: Pick<OrderItemRow, 'id' | 'product_id' | 'nombre_producto' | 'cantidad' | 'precio_unitario' | 'precio_total' | 'unidades_stock'>[]
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        nombre_producto,
        cantidad,
        precio_unitario,
        precio_total,
        unidades_stock
      )
    `)
    .eq('numero_pedido', orderNumber)
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
// Usa la función Postgres decrement_product_stock (ver supabase/schema.sql),
// que hace UPDATE ... WHERE stock >= qty de forma atómica contra race conditions.
// ─────────────────────────────────────────────────────────────────────────────

export async function decrementProductStock(productId: string, qty: number): Promise<boolean> {
  if (qty <= 0) return true

  const db = createServiceClient()
  const { data, error } = await db.rpc('decrement_product_stock', {
    p_product_id: productId,
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
