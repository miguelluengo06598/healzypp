// ─────────────────────────────────────────────────────────────────────────────
// Notificaciones vía ntfy (ntfy.sh)
// Requiere variable de entorno NTFY_TOPIC
// ─────────────────────────────────────────────────────────────────────────────

// Contenido deliberadamente mínimo: ntfy.sh solo está protegido por el
// secreto del nombre del topic (sin token de acceso), así que no debe llevar
// PII en texto plano (nombre, teléfono, dirección). paymentIntentId no es PII
// — es la clave de búsqueda real hoy en el dashboard de Stripe, a falta de
// panel admin propio en la app al que enlazar.
import { SITE_NAME } from '@/lib/site'

export interface OrderNotificationData {
  orderNumber: string
  totalEuros: number
  status: 'new' | 'confirmed' | 'failed'
  failureReason?: string
  paymentIntentId?: string
}

export async function sendOrderNotification(data: OrderNotificationData): Promise<void> {
  const topic = process.env.NTFY_TOPIC
  if (!topic) {
    console.warn('[ntfy] NTFY_TOPIC no configurado. Notificación omitida.')
    return
  }

  const title = data.status === 'failed'
    ? `❌ Pago fallido ${SITE_NAME}`
    : `🛒 Nuevo pedido ${SITE_NAME}`

  const tags = data.status === 'failed' ? 'warning,money_with_wings' : 'shopping,moneybag'
  const priority = 'high'

  const lines = [
    `Pedido: ${data.orderNumber}`,
    `Total: ${data.totalEuros.toFixed(2)} €`,
    data.paymentIntentId && `Stripe PI: ${data.paymentIntentId}`,
    data.failureReason && `Motivo: ${data.failureReason}`,
  ].filter(Boolean) as string[]

  const message = lines.join('\n')

  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags,
      },
      body: message,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error')
      console.error(`[ntfy] Error HTTP ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error('[ntfy] Error de red al enviar notificación:', err instanceof Error ? err.message : err)
  }
}
