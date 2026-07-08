// ─────────────────────────────────────────────────────────────────────────────
// Utilidades server-side para Meta Conversions API (CAPI)
// Hashea PII con SHA-256 y construye payloads tipados para Graph API.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto'

const GRAPH_API_VERSION = 'v19.0'

function getPixelId(): string {
  const id = process.env.META_PIXEL_ID
  if (!id) throw new Error('META_PIXEL_ID no configurado')
  return id
}

function getAccessToken(): string {
  const token = process.env.META_CAPI_ACCESS_TOKEN
  if (!token) throw new Error('META_CAPI_ACCESS_TOKEN no configurado')
  return token
}

/**
 * Hashea un valor para Meta CAPI usando SHA-256.
 * Meta requiere que los datos PII estén normalizados (minúsculas, sin espacios extras)
 * antes de hashear.
 */
export function hashForMeta(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  return createHash('sha256').update(normalized).digest('hex')
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface MetaUserData {
  em?: string | null        // email (hasheado)
  ph?: string | null        // teléfono (hasheado)
  fn?: string | null        // first name (hasheado)
  ln?: string | null        // last name (hasheado)
  ct?: string | null        // city (hasheado)
  zp?: string | null        // zip (hasheado)
  st?: string | null        // state (hasheado)
  country?: string | null   // country code (sin hash, 2 letras)
  client_ip_address?: string | null
  client_user_agent?: string | null
  fbc?: string | null       // click id
  fbp?: string | null       // browser id
}

export interface MetaCustomData {
  value?: number
  currency?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  content_category?: string
  num_items?: number
  order_id?: string
  predicted_ltv?: number
  status?: string
  [key: string]: unknown
}

export interface MetaCAPIPayload {
  event_name: string
  event_id: string
  event_time: number
  action_source: 'website'
  event_source_url: string
  user_data: MetaUserData
  custom_data?: MetaCustomData
}

interface MetaCAPISingleEvent {
  data: Array<{
    event_name: string
    event_id: string
    event_time: number
    action_source: string
    event_source_url: string
    user_data: Record<string, string | null>
    custom_data?: MetaCustomData
  }>
}

/**
 * Envía un evento a Meta Conversions API.
 * Nunca loguea datos PII sin hash.
 */
export async function sendMetaCAPIEvent(payload: MetaCAPIPayload): Promise<unknown> {
  const pixelId = getPixelId()
  const accessToken = getAccessToken()

  const body: MetaCAPISingleEvent = {
    data: [
      {
        event_name: payload.event_name,
        event_id: payload.event_id,
        event_time: payload.event_time,
        action_source: payload.action_source,
        event_source_url: payload.event_source_url,
        user_data: {
          em: payload.user_data.em ?? null,
          ph: payload.user_data.ph ?? null,
          fn: payload.user_data.fn ?? null,
          ln: payload.user_data.ln ?? null,
          ct: payload.user_data.ct ?? null,
          zp: payload.user_data.zp ?? null,
          st: payload.user_data.st ?? null,
          country: payload.user_data.country ?? null,
          client_ip_address: payload.user_data.client_ip_address ?? null,
          client_user_agent: payload.user_data.client_user_agent ?? null,
          fbc: payload.user_data.fbc ?? null,
          fbp: payload.user_data.fbp ?? null,
        },
        custom_data: payload.custom_data,
      },
    ],
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(`Meta CAPI error ${res.status}: ${JSON.stringify(data)}`)
  }

  return data
}
