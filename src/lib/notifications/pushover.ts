const PUSHOVER_API = 'https://api.pushover.net/1/messages.json'

export interface PushoverMessage {
  title: string
  message: string
  priority?: -2 | -1 | 0 | 1 | 2
  sound?: string
  url?: string
  url_title?: string
}

export async function sendPushover(msg: PushoverMessage): Promise<void> {
  console.log('[Pushover] USER_KEY existe:', !!process.env.PUSHOVER_USER_KEY)
  console.log('[Pushover] API_TOKEN existe:', !!process.env.PUSHOVER_API_TOKEN)

  if (!process.env.PUSHOVER_USER_KEY || !process.env.PUSHOVER_API_TOKEN) {
    console.warn('[Pushover] Faltan variables de entorno')
    return
  }

  try {
    const res = await fetch(PUSHOVER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: process.env.PUSHOVER_API_TOKEN,
        user: process.env.PUSHOVER_USER_KEY,
        title: msg.title,
        message: msg.message,
        priority: msg.priority ?? 0,
        sound: msg.sound ?? 'cashregister',
        url: msg.url,
        url_title: msg.url_title,
      }),
    })

    const responseData = await res.json().catch(() => ({}))
    console.log('[Pushover] Respuesta:', res.status, responseData)

    if (!res.ok) {
      console.error(`[Pushover] HTTP ${res.status}:`, responseData)
    }
  } catch (err) {
    console.error('[Pushover] Error enviando notificación:', err instanceof Error ? err.message : err)
  }
}

export interface OrderItemLike {
  nombre_producto?: string
  product_title?: string
  cantidad?: number
  quantity?: number
}

export function formatOrderItems(items: OrderItemLike[]): string {
  return items
    .map((i) => {
      const name = i.nombre_producto ?? i.product_title ?? 'Producto'
      const qty = i.cantidad ?? i.quantity ?? 1
      return `· ${name} x${qty}`
    })
    .join('\n')
}
