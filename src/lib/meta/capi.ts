// ─────────────────────────────────────────────────────────────────────────────
// Utilidades server-side para Meta Conversions API (CAPI)
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto'
import { SITE_URL } from '@/lib/site'

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

/** SHA-256 + normalización (lowercase + trim). Retorna null si el valor está vacío. */
export function hashForMeta(value: string | null | undefined): string | null {
  if (!value) return null
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

/** Event_id determinístico para Purchase — ambos lados (browser + servidor) usan el mismo. */
export function getPurchaseEventId(orderNumber: string): string {
  return `purchase_${orderNumber}`
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MetaUserData {
  em?: string | null
  ph?: string | null
  fn?: string | null
  ln?: string | null
  ct?: string | null
  zp?: string | null
  st?: string | null
  country?: string | null
  client_ip_address?: string | null
  client_user_agent?: string | null
  fbc?: string | null
  fbp?: string | null
}

export interface MetaCustomData {
  value?: number
  currency?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  num_items?: number
  order_id?: string
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

// ─── Envío a la Graph API ────────────────────────────────────────────────────

export async function sendMetaCAPIEvent(payload: MetaCAPIPayload): Promise<unknown> {
  const pixelId    = getPixelId()
  const accessToken = getAccessToken()
  const testEventCode = process.env.META_TEST_EVENT_CODE

  const body = {
    data: [
      {
        event_name:        payload.event_name,
        event_id:          payload.event_id,
        event_time:        payload.event_time,
        action_source:     payload.action_source,
        event_source_url:  payload.event_source_url,
        user_data: {
          em:                  payload.user_data.em              ?? null,
          ph:                  payload.user_data.ph              ?? null,
          fn:                  payload.user_data.fn              ?? null,
          ln:                  payload.user_data.ln              ?? null,
          ct:                  payload.user_data.ct              ?? null,
          zp:                  payload.user_data.zp              ?? null,
          st:                  payload.user_data.st              ?? null,
          country:             payload.user_data.country         ?? null,
          client_ip_address:   payload.user_data.client_ip_address  ?? null,
          client_user_agent:   payload.user_data.client_user_agent  ?? null,
          fbc:                 payload.user_data.fbc             ?? null,
          fbp:                 payload.user_data.fbp             ?? null,
        },
        custom_data: payload.custom_data,
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Meta CAPI error ${res.status}: ${JSON.stringify(data)}`)
  }

  return data
}

// ─── Función de conveniencia para Purchase ────────────────────────────────────

export interface ServerPurchaseParams {
  orderNumber:   string
  email?:        string | null
  phone?:        string | null
  firstName?:    string | null
  lastName?:     string | null
  city?:         string | null
  zip?:          string | null
  totalEur:      number
  contentIds?:   string[]
  clientIp?:     string | null
  userAgent?:    string | null
}

/** Envía Purchase a CAPI desde el servidor (webhook o server action).
 *  Usa event_id determinístico → deduplicado con el evento de navegador. */
export async function sendPurchaseCAPI(params: ServerPurchaseParams): Promise<void> {
  await sendMetaCAPIEvent({
    event_name:       'Purchase',
    event_id:         getPurchaseEventId(params.orderNumber),
    event_time:       Math.floor(Date.now() / 1000),
    action_source:    'website',
    event_source_url: `${SITE_URL}/order/confirmation`,
    user_data: {
      em:                hashForMeta(params.email),
      ph:                hashForMeta(params.phone),
      fn:                hashForMeta(params.firstName),
      ln:                hashForMeta(params.lastName),
      ct:                hashForMeta(params.city),
      zp:                hashForMeta(params.zip),
      country:           'es',
      client_ip_address: params.clientIp  ?? null,
      client_user_agent: params.userAgent ?? null,
    },
    custom_data: {
      value:        params.totalEur,
      currency:     'EUR',
      content_ids:  params.contentIds ?? [],
      content_type: 'product',
      order_id:     params.orderNumber,
      num_items:    1,
    },
  })
}
