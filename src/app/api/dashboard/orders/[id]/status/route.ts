// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/dashboard/orders/[id]/status
// Cambia el estado de un pedido desde el dashboard SaaS externo.
//
// Protegido por Authorization: Bearer <DASHBOARD_API_TOKEN>, igual que el
// resto de /api/dashboard/* (ver src/lib/dashboard-api-auth.ts).
//
// Los cinco estados que maneja el dashboard NO son cinco valores del enum:
//   Pagado          → 'pagado'      (lo escribe el webhook de Stripe, no esto)
//   Preparado       → 'procesando'
//   Enviado         → 'enviado'   + numeroTracking
//   Se entrega hoy  → 'enviado'   + numeroTracking + fechaEstimadaEntrega = hoy
//   Incidencia      → NO cambia el estado; rellena orders.incidencia
// Ver database/migrations/001-estado-pedido-envio.sql para el porqué.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { authenticateDashboardRequest, hashToken } from '@/lib/dashboard-api-auth'
import { orderDetailRatelimit } from '@/lib/rate-limit'
import { sendEnvioEmail } from '@/lib/email'
import { sendPushover } from '@/lib/notifications/pushover'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Estados a los que este endpoint permite mover un pedido. 'pagado' y
 *  'fallido' quedan fuera a propósito: los escribe el webhook de Stripe según
 *  lo que diga el cobro, no una persona desde el dashboard. */
const ESTADO_DESTINO = ['procesando', 'enviado', 'entregado', 'cancelado', 'reembolsado'] as const
type EstadoDestino = (typeof ESTADO_DESTINO)[number]

const BodySchema = z
  .object({
    estado: z.enum(ESTADO_DESTINO).optional(),
    numeroTracking: z.string().min(1).max(100).trim().optional(),
    empresaEnvio: z.string().max(100).trim().optional(),
    /** "Se entrega hoy": mismo estado 'enviado', con fecha estimada = hoy. */
    entregaHoy: z.boolean().default(false),
    /** Texto de incidencia. `null` explícito la borra. */
    incidencia: z.string().max(500).trim().nullable().optional(),
  })
  .refine((b) => b.estado !== undefined || b.incidencia !== undefined, {
    message: 'Indica al menos `estado` o `incidencia`',
  })

/** Transiciones permitidas. Nunca hacia atrás, y nunca desde un pedido que no
 *  se ha cobrado: preparar o enviar algo en estado 'pendiente' o 'fallido'
 *  sería enviar mercancía sin cobrar. */
const TRANSICIONES: Record<string, EstadoDestino[]> = {
  pendiente:   [],
  fallido:     [],
  pagado:      ['procesando', 'cancelado'],
  procesando:  ['enviado', 'cancelado'],
  enviado:     ['entregado'],
  entregado:   ['reembolsado'],
  cancelado:   ['reembolsado'],
  reembolsado: [],
}

const DESCRIPCION: Record<EstadoDestino, string> = {
  procesando:  'Pedido preparado',
  enviado:     'Pedido enviado',
  entregado:   'Pedido entregado',
  cancelado:   'Pedido cancelado',
  reembolsado: 'Pedido reembolsado',
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateDashboardRequest(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 })
  }

  // Mismo techo dedicado que el GET de detalle: este endpoint también toca un
  // pedido concreto y además dispara un email al cliente.
  const authHeader = req.headers.get('authorization') ?? ''
  const [, token] = authHeader.split(' ')
  const tokenHash = hashToken(token ?? '')
  const { success, remaining, reset } = await orderDetailRatelimit.limit(tokenHash)
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'Retry-After': String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
        },
      }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const body = parsed.data

  // Enviar sin número de seguimiento dejaría al cliente un email sin el dato
  // que justifica el email.
  if (body.estado === 'enviado' && !body.numeroTracking) {
    return NextResponse.json(
      { error: 'numeroTracking es obligatorio al marcar el pedido como enviado' },
      { status: 400 }
    )
  }
  if (body.entregaHoy && body.estado !== 'enviado') {
    return NextResponse.json(
      { error: 'entregaHoy solo aplica al estado "enviado"' },
      { status: 400 }
    )
  }

  try {
    const db = createServiceClient()

    const { data: order, error: readError } = await db
      .from('orders')
      .select('id, numero_pedido, estado, email_cliente, nombre_cliente, total, incidencia')
      .eq('id', id)
      .maybeSingle()

    if (readError) throw readError
    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const estadoActual = order.estado as string
    const nuevoEstado = body.estado

    // Idempotencia: repetir el mismo estado no reenvía el email ni duplica el
    // historial. Protege del doble clic en el dashboard.
    const estadoCambia = nuevoEstado !== undefined && nuevoEstado !== estadoActual

    if (nuevoEstado !== undefined && estadoCambia) {
      const permitidos = TRANSICIONES[estadoActual] ?? []
      if (!permitidos.includes(nuevoEstado)) {
        return NextResponse.json(
          {
            error: `Transición no permitida: ${estadoActual} → ${nuevoEstado}`,
            permitidos,
          },
          { status: 409 }
        )
      }
    }

    // ── Actualizar el pedido ────────────────────────────────────────────────
    const updates: Record<string, unknown> = { fecha_actualizacion: new Date().toISOString() }
    if (estadoCambia) updates.estado = nuevoEstado
    if (body.incidencia !== undefined) updates.incidencia = body.incidencia

    const { error: updateError } = await db.from('orders').update(updates).eq('id', id)
    if (updateError) throw updateError

    // ── Historial ───────────────────────────────────────────────────────────
    const hoy = new Date().toISOString().slice(0, 10)
    if (estadoCambia && nuevoEstado) {
      const { error: trackingError } = await db.from('order_tracking').insert({
        order_id: id,
        estado: nuevoEstado,
        descripcion: body.entregaHoy ? 'Pedido enviado — entrega prevista hoy' : DESCRIPCION[nuevoEstado],
        numero_tracking: body.numeroTracking ?? null,
        empresa_envio: body.empresaEnvio ?? null,
        fecha_estimada_entrega: body.entregaHoy ? hoy : null,
      })
      // No fatal: el estado ya cambió y es lo que manda. El historial es
      // información derivada.
      if (trackingError) {
        console.error('[dashboard/orders/status] order_tracking insert error:', trackingError.message)
      }
    }

    // ── Email al cliente, solo al pasar a 'enviado' ─────────────────────────
    let email: { enviado: boolean; motivo?: string } = { enviado: false }

    if (estadoCambia && nuevoEstado === 'enviado') {
      if (!order.email_cliente) {
        email = { enviado: false, motivo: 'el pedido no tiene email de cliente' }
      } else {
        const { data: items } = await db
          .from('order_items')
          .select('nombre_producto, cantidad')
          .eq('order_id', id)

        const resultado = await sendEnvioEmail({
          to: order.email_cliente,
          nombreCliente: order.nombre_cliente ?? '',
          numeroPedido: order.numero_pedido ?? '',
          numeroTracking: body.numeroTracking!,
          empresaEnvio: body.empresaEnvio ?? null,
          fechaEstimadaEntrega: body.entregaHoy ? hoy : null,
          items: (items ?? []).map((i) => ({
            nombre: i.nombre_producto as string,
            cantidad: (i.cantidad as number) ?? 1,
          })),
          totalEur: Number(order.total ?? 0),
        })

        if (resultado.ok) {
          email = { enviado: true }
        } else {
          // El pedido ya está enviado; deshacerlo por un fallo de correo sería
          // peor. Se avisa al dueño para que contacte a mano.
          email = { enviado: false, motivo: resultado.error }
          console.error('[dashboard/orders/status] email de envío falló:', resultado.error)
          sendPushover({
            title: '⚠️ Email de envío no entregado',
            message:
              `El pedido #${order.numero_pedido} se marcó como enviado, pero no se pudo ` +
              `avisar al cliente por email (${resultado.error}). Avísale a mano.`,
            priority: 1,
            sound: 'falling',
          }).catch((e) => console.error('[dashboard/orders/status] Pushover error:', e))
        }
      }
    }

    // Auditoría: solo metadatos, nunca datos del cliente.
    console.log(
      '[audit] order_status_change',
      JSON.stringify({
        token_hash: tokenHash,
        order_id: id,
        de: estadoActual,
        a: nuevoEstado ?? estadoActual,
        entrega_hoy: body.entregaHoy,
        email_enviado: email.enviado,
        at: new Date().toISOString(),
      })
    )

    return NextResponse.json(
      {
        id,
        estadoAnterior: estadoActual,
        estado: nuevoEstado ?? estadoActual,
        cambiado: estadoCambia,
        entregaHoy: body.entregaHoy,
        incidencia: body.incidencia !== undefined ? body.incidencia : (order.incidencia ?? null),
        email,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[dashboard/orders/[id]/status] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
