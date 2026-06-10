// ─────────────────────────────────────────────────────────────────────────────
// POST /api/track
// Recibe batches de eventos de tracking y los persiste en Supabase.
// Diseñado para ser ultra-rápido: validación + insert paralelo.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { trackRatelimit, getClientIp } from '@/lib/rate-limit'
import type { TrackingEvent, TrackingSession } from '@/types/tracking.types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const DeviceInfoSchema = z.object({
  os: z.string().optional(),
  browser: z.string().optional(),
  screen: z.string().optional(),
  language: z.string().optional(),
})

const SessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  fingerprint: z.string(),
  device_type: z.enum(['mobile', 'desktop', 'tablet', 'unknown']),
  device_info: DeviceInfoSchema.default({}),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
  landing_page: z.string(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
  utm_term: z.string().nullable().optional(),
  consent_given: z.boolean().default(false),
  created_at: z.string().optional(),
})

const BaseEventSchema = z.object({
  eventType: z.string(),
  sessionId: z.string().uuid(),
  timestamp: z.number(),
  url: z.string(),
})

const PageViewEventSchema = BaseEventSchema.extend({
  eventType: z.literal('page_view'),
  path: z.string(),
  title: z.string(),
  durationSeconds: z.number().optional(),
})

const ProductViewEventSchema = BaseEventSchema.extend({
  eventType: z.literal('product_view'),
  productId: z.number().int().positive(),
  productSlug: z.string(),
  durationSeconds: z.number().optional(),
})

const CartActionEventSchema = BaseEventSchema.extend({
  eventType: z.literal('cart_action'),
  productId: z.number().int().positive(),
  bundleId: z.number().int().positive().nullable().optional(),
  action: z.enum(['add', 'remove', 'update']),
  quantity: z.number().int().min(0),
  unitPrice: z.number().optional().nullable(),
  cartTotal: z.number().optional().nullable(),
})

const CheckoutEventSchema = BaseEventSchema.extend({
  eventType: z.enum(['checkout_start', 'checkout_complete']),
  step: z.enum(['init', 'shipping', 'payment', 'review']).optional(),
  cartTotal: z.number().optional().nullable(),
  itemsCount: z.number().int().optional().nullable(),
})

const ConversionEventSchema = BaseEventSchema.extend({
  eventType: z.literal('conversion'),
  orderId: z.string().uuid().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
  totalAmount: z.number().positive(),
  itemsCount: z.number().int().positive(),
  paymentMethod: z.string().optional().nullable(),
})

const AbandonmentEventSchema = BaseEventSchema.extend({
  eventType: z.literal('abandonment'),
  reason: z.string(),
  lastPage: z.string(),
  cartValue: z.number().optional().nullable(),
  itemsInCart: z.number().int().optional().nullable(),
})

const HeartbeatEventSchema = BaseEventSchema.extend({
  eventType: z.literal('heartbeat'),
})

const EventSchema = z.discriminatedUnion('eventType', [
  PageViewEventSchema,
  ProductViewEventSchema,
  CartActionEventSchema,
  CheckoutEventSchema,
  ConversionEventSchema,
  AbandonmentEventSchema,
  HeartbeatEventSchema,
])

const BatchSchema = z.object({
  session: SessionSchema,
  events: z.array(EventSchema).max(50),
})

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit: 60 batches por IP por minuto (Upstash Redis)
  const ip = getClientIp(req)
  const { success: allowed, remaining } = await trackRatelimit.limit(ip)
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  const parsed = BatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { session, events } = parsed.data

  try {
    const supabase = createServiceClient()

    // Upsert sesión (idempotente)
    const { error: sessionError } = await supabase
      .from('tracking_sessions')
      .upsert(
        {
          id: session.id,
          user_id: session.user_id ?? null,
          fingerprint: session.fingerprint,
          device_type: session.device_type,
          device_info: session.device_info,
          country: session.country,
          region: session.region,
          city: session.city,
          referrer: session.referrer,
          landing_page: session.landing_page,
          utm_source: session.utm_source,
          utm_medium: session.utm_medium,
          utm_campaign: session.utm_campaign,
          utm_content: session.utm_content,
          utm_term: session.utm_term,
          consent_given: session.consent_given,
        },
        { onConflict: 'id' }
      )

    if (sessionError) {
      console.error('[track] session upsert error:', sessionError)
    }

    // Procesar eventos en paralelo
    const promises = events.map((event) => persistEvent(supabase, session, event))
    const results = await Promise.allSettled(promises)

    const processed = results.filter((r) => r.status === 'fulfilled').length
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message ?? 'Unknown error')

    return NextResponse.json(
      {
        success: errors.length === 0,
        sessionId: session.id,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      },
      {
        status: errors.length > 0 ? 207 : 200,
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      }
    )
  } catch (err) {
    console.error('[track] unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Persistencia de eventos ─────────────────────────────────────────────────

async function persistEvent(
  supabase: ReturnType<typeof createServiceClient>,
  session: z.infer<typeof SessionSchema>,
  event: z.infer<typeof EventSchema>
) {
  const base = {
    session_id: event.sessionId,
    created_at: new Date(event.timestamp).toISOString(),
  }

  switch (event.eventType) {
    case 'page_view':
      return supabase.from('tracking_page_views').insert({
        ...base,
        url: event.url,
        path: event.path,
        title: event.title,
        duration_seconds: event.durationSeconds ?? 0,
      })

    case 'product_view':
      return supabase.from('tracking_product_views').insert({
        ...base,
        product_id: event.productId,
        product_slug: event.productSlug,
        duration_seconds: event.durationSeconds ?? 0,
      })

    case 'cart_action':
      return supabase.from('tracking_cart_actions').insert({
        ...base,
        product_id: event.productId,
        bundle_id: event.bundleId ?? null,
        action: event.action,
        quantity: event.quantity,
        unit_price: event.unitPrice ?? null,
        cart_total: event.cartTotal ?? null,
      })

    case 'checkout_start':
      return supabase.from('tracking_checkouts').insert({
        ...base,
        step: event.step ?? 'init',
        cart_total: event.cartTotal ?? null,
        items_count: event.itemsCount ?? null,
        completed: false,
      })

    case 'checkout_complete':
      // Actualizar checkout existente si hay uno
      await supabase
        .from('tracking_checkouts')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('session_id', event.sessionId)
        .is('completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
      return { data: null, error: null }

    case 'conversion':
      return supabase.from('tracking_conversions').insert({
        ...base,
        order_id: event.orderId ?? null,
        order_number: event.orderNumber ?? null,
        total_amount: event.totalAmount,
        items_count: event.itemsCount,
        payment_method: event.paymentMethod ?? null,
      })

    case 'abandonment':
      return supabase.from('tracking_abandonments').insert({
        ...base,
        reason: event.reason,
        last_page: event.lastPage,
        cart_value: event.cartValue ?? 0,
        items_in_cart: event.itemsInCart ?? 0,
      })

    case 'heartbeat':
      // No persistimos heartbeat; solo sirve para mantener sesión viva
      return { data: null, error: null }

    default:
      // Guardar evento crudo como fallback (nunca debería llegar aquí)
      return supabase.from('tracking_events').insert({
        session_id: base.session_id,
        event_type: (event as { eventType: string }).eventType,
        payload: event as unknown as Record<string, unknown>,
      })
  }
}
