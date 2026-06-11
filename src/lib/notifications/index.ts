// ─────────────────────────────────────────────────────────────────────────────
// Notificaciones vía ntfy (ntfy.sh)
// Requiere variable de entorno NTFY_TOPIC
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderNotificationData {
  orderNumber: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  address?: string
  city?: string
  province?: string
  bundleName?: string
  totalEuros: number
  paymentMethod?: 'COD' | 'CARD'
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
    ? '❌ Pago fallido HEALZYP'
    : '🛒 Nuevo pedido HEALZYP'

  const tags = data.status === 'failed' ? 'warning,money_with_wings' : 'shopping,moneybag'
  const priority = 'high'

  const lines = [
    `Pedido: ${data.orderNumber}`,
    `Cliente: ${data.customerName}`,
    data.customerPhone && `Teléfono: ${data.customerPhone}`,
    data.customerEmail && `Email: ${data.customerEmail}`,
    data.address && `Dirección: ${data.address}`,
    data.city && `Ciudad: ${data.city}`,
    data.province && `Provincia: ${data.province}`,
    data.bundleName && `Producto: ${data.bundleName}`,
    `Total: ${data.totalEuros.toFixed(2)} €`,
    data.paymentMethod && `Método: ${data.paymentMethod === 'COD' ? 'Contra reembolso' : 'Tarjeta'}`,
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
