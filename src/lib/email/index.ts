// ─────────────────────────────────────────────────────────────────────────────
// Email transaccional al CLIENTE vía Resend.
//
// Ojo a la diferencia con las otras notificaciones del proyecto: ntfy y
// Pushover van dirigidas al dueño de la tienda y por eso llevan el mínimo de
// datos personales posible. Este canal va dirigido al propio cliente, así que
// sí lleva sus datos — pero solo los que necesita para reconocer su pedido.
// El asunto y el preheader NO llevan dirección ni teléfono: son lo único que
// se ve sin abrir el correo, incluso en la pantalla de bloqueo del móvil.
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from 'resend'
import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from '@/lib/site'

export interface EnvioEmailParams {
  to: string
  nombreCliente: string
  numeroPedido: string
  numeroTracking: string
  empresaEnvio?: string | null
  /** Si es hoy, el email dice "llega hoy" en vez de "va en camino". */
  fechaEstimadaEntrega?: string | null
  items: { nombre: string; cantidad: number }[]
  totalEur: number
}

export type EnvioEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function esHoy(fecha: string | null | undefined): boolean {
  if (!fecha) return false
  const hoy = new Date().toISOString().slice(0, 10)
  return fecha.slice(0, 10) === hoy
}

/** Plantilla del email de envío. Exportada aparte del envío para poder
 *  inspeccionarla en pruebas sin gastar una llamada a Resend. */
export function renderEnvioEmail(params: EnvioEmailParams): {
  subject: string
  html: string
  text: string
} {
  const hoy = esHoy(params.fechaEstimadaEntrega)
  const nombre = escapeHtml(params.nombreCliente.split(' ')[0] || 'Hola')
  const pedido = escapeHtml(params.numeroPedido)
  const tracking = escapeHtml(params.numeroTracking)
  const transporte = params.empresaEnvio ? escapeHtml(params.empresaEnvio) : null

  const subject = hoy
    ? `Tu pedido ${params.numeroPedido} llega hoy`
    : `Tu pedido ${params.numeroPedido} va en camino`

  const titular = hoy ? '¡Tu pedido llega hoy!' : '¡Tu pedido va en camino!'
  // En minúscula: va detrás de "Nombre, …" en la misma frase.
  const entradilla = hoy
    ? 'está previsto que lo recibas hoy mismo.'
    : 'ya lo hemos entregado al transportista.'

  const lineasItems = params.items
    .map((i) => `<li>${escapeHtml(i.nombre)} × ${i.cantidad}</li>`)
    .join('')

  const urlPedidos = `${SITE_URL}/account/orders`

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E5E5;border-radius:16px;padding:28px;">
    <h1 style="margin:0 0 8px;font-size:22px;">${titular}</h1>
    <p style="margin:0 0 20px;color:#555;font-size:15px;">
      ${nombre}, ${entradilla}
    </p>

    <div style="background:#F0F4EC;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#555;">Número de seguimiento</p>
      <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.5px;">${tracking}</p>
      ${transporte ? `<p style="margin:6px 0 0;font-size:13px;color:#555;">Transporte: ${transporte}</p>` : ''}
    </div>

    <p style="margin:0 0 6px;font-size:13px;color:#555;">Pedido ${pedido}</p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#333;">
      ${lineasItems}
    </ul>
    <p style="margin:0 0 24px;font-size:14px;">
      <strong>Total:</strong> ${params.totalEur.toFixed(2).replace('.', ',')} €
    </p>

    <a href="${urlPedidos}"
       style="display:inline-block;background:#487D26;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:15px;">
      Ver el estado de mi pedido
    </a>

    <p style="margin:24px 0 0;font-size:13px;color:#777;">
      ¿Alguna duda? Escríbenos a
      <a href="mailto:${CONTACT_EMAIL}" style="color:#487D26;">${CONTACT_EMAIL}</a>.
    </p>
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#999;text-align:center;">
    ${escapeHtml(SITE_NAME)}
  </p>
</body>
</html>`

  const text = [
    titular,
    '',
    `${params.nombreCliente.split(' ')[0] || 'Hola'}, ${entradilla}`,
    '',
    `Número de seguimiento: ${params.numeroTracking}`,
    params.empresaEnvio ? `Transporte: ${params.empresaEnvio}` : null,
    '',
    `Pedido ${params.numeroPedido}`,
    ...params.items.map((i) => `- ${i.nombre} x${i.cantidad}`),
    `Total: ${params.totalEur.toFixed(2).replace('.', ',')} €`,
    '',
    `Ver el estado de tu pedido: ${urlPedidos}`,
    '',
    `¿Dudas? Escríbenos a ${CONTACT_EMAIL}`,
  ]
    .filter((l) => l !== null)
    .join('\n')

  return { subject, html, text }
}

/** Envía el email de envío. Nunca lanza: el cambio de estado del pedido no
 *  debe deshacerse porque el correo falle. */
export async function sendEnvioEmail(params: EnvioEmailParams): Promise<EnvioEmailResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY no configurado' }
  }

  const from = process.env.EMAIL_FROM
  if (!from) {
    return { ok: false, error: 'EMAIL_FROM no configurado' }
  }

  const { subject, html, text } = renderEnvioEmail(params)

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
      text,
      replyTo: CONTACT_EMAIL,
    })

    if (error) {
      // El mensaje de Resend no incluye PII, solo el motivo del rechazo.
      return { ok: false, error: error.message ?? 'Error desconocido de Resend' }
    }
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
