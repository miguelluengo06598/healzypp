// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta/capi
// Recibe eventos del browser y los reenvía a Meta Conversions API (CAPI)
// con PII hasheado. Guarda auditoría en Supabase.
//
// Requiere consentimiento previo (el browser solo envía si consent==granted).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendMetaCAPIEvent, hashForMeta } from '@/lib/meta-capi'
import { createServiceClient } from '@/lib/supabase'
import { metaCapiRatelimit, getClientIp } from '@/lib/rate-limit'

const BodySchema = z.object({
  event_name: z.enum([
    'PageView',
    'ViewContent',
    'AddToCart',
    'InitiateCheckout',
    'Purchase',
  ]),
  event_id: z.string().min(1),
  event_data: z.record(z.string(), z.unknown()).default({}),
  user_data: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().length(2).optional(),
    client_user_agent: z.string().optional(),
    fbc: z.string().optional(),
    fbp: z.string().optional(),
  }).default({}),
})

export async function POST(req: NextRequest) {
  // ── Rate limit: 100 eventos/minuto/IP ───────────────────────────────────────
  const ip = getClientIp(req)

  let allowed = true
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[meta/capi] Upstash Redis no configurado: rate limit desactivado')
  } else {
    const result = await metaCapiRatelimit.limit(ip)
    allowed = result.success
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { event_name, event_id, event_data, user_data } = parsed.data
  const eventSourceUrl = req.headers.get('referer') ?? ''
  const userAgent = req.headers.get('user-agent') ?? ''

  // ── Hashear PII (requisito de Meta) ─────────────────────────────────────────
  const hashedUserData = {
    em: hashForMeta(user_data.email),
    ph: hashForMeta(user_data.phone),
    fn: hashForMeta(user_data.firstName),
    ln: hashForMeta(user_data.lastName),
    ct: hashForMeta(user_data.city),
    zp: hashForMeta(user_data.zip),
    country: user_data.country ?? null,
    client_ip_address: ip,
    client_user_agent: user_data.client_user_agent ?? userAgent,
    fbc: user_data.fbc ?? null,
    fbp: user_data.fbp ?? null,
  }

  try {
    // ── Enviar a Meta CAPI ──────────────────────────────────────────────────
    const metaResponse = await sendMetaCAPIEvent({
      event_name,
      event_id,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: eventSourceUrl,
      user_data: hashedUserData,
      custom_data: event_data as Record<string, unknown>,
    })

    // ── Guardar auditoría en Supabase ───────────────────────────────────────
    const db = createServiceClient()
    await db.from('meta_pixel_events').insert({
      event_id,
      event_name,
      pixel_id: process.env.META_PIXEL_ID ?? '',
      payload: event_data,
      capi_response: metaResponse,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Nunca loggear PII ni datos sensibles
    console.error('[meta-capi] Error enviando evento:', msg)
    return NextResponse.json({ error: 'Failed to send event' }, { status: 502 })
  }
}
