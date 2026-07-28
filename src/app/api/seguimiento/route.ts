// ─────────────────────────────────────────────────────────────────────────────
// POST /api/seguimiento
// Consulta PÚBLICA (sin sesión) del estado de un pedido, para quien compró
// como invitado o no quiere iniciar sesión. Requiere número de pedido Y email:
// el número solo no basta, porque es correlativo y adivinable.
//
// Reglas de diseño, todas por la misma razón (que nadie pesque pedidos ajenos):
//  · Un ÚNICO mensaje de error para "no existe" y "el email no coincide". Dos
//    mensajes distintos convertirían el endpoint en un validador de números de
//    pedido.
//  · Una sola consulta que filtra por ambos campos, así no hay dos caminos de
//    código con tiempos distintos que delaten cuál de los dos falló.
//  · Suelo de tiempo de respuesta idéntico en éxito y en fallo.
//  · Rate limit estricto que NO falla abierto (ver seguimientoRatelimit).
//  · La respuesta lleva lo justo para seguir el envío: nada de dirección,
//    teléfono ni apellidos. Quien acierte número+email ya conoce esos datos,
//    pero no hay motivo para servirlos aquí.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { seguimientoRatelimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** Suelo de respuesta. Iguala éxito y fallo para que el tiempo no delate si
 *  el pedido existía, y de paso encarece el escaneo automatizado. */
const RESPUESTA_MINIMA_MS = 700

const ERROR_GENERICO =
  'No encontramos ningún pedido con esos datos. Revisa el número de pedido y el email con el que compraste.'

const BodySchema = z.object({
  numeroPedido: z.string().min(3).max(50).trim(),
  email: z.string().email().max(200).trim(),
})

async function conSueloDeTiempo<T>(inicio: number, valor: T): Promise<T> {
  const transcurrido = Date.now() - inicio
  if (transcurrido < RESPUESTA_MINIMA_MS) {
    await new Promise((r) => setTimeout(r, RESPUESTA_MINIMA_MS - transcurrido))
  }
  return valor
}

export async function POST(req: NextRequest) {
  const inicio = Date.now()

  const ip = getClientIp(req)
  const { success, remaining, reset } = await seguimientoRatelimit.limit(`seguimiento:${ip}`)
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera un poco antes de volver a probar.' },
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
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    // Mismo mensaje que el de "no encontrado": un formato inválido tampoco
    // debe distinguirse de una combinación que simplemente no existe.
    return conSueloDeTiempo(inicio, NextResponse.json({ error: ERROR_GENERICO }, { status: 404 }))
  }

  const numeroPedido = parsed.data.numeroPedido.toUpperCase()
  const email = parsed.data.email.toLowerCase()

  try {
    const db = createServiceClient()

    // Filtro por AMBOS campos en la misma consulta: no hay forma de saber cuál
    // de los dos falló, ni desde fuera ni por tiempo de respuesta.
    const { data: order, error } = await db
      .from('orders')
      .select('id, numero_pedido, estado, incidencia, fecha_creacion, fecha_actualizacion')
      .eq('numero_pedido', numeroPedido)
      .ilike('email_cliente', email)
      .maybeSingle()

    if (error) throw error

    if (!order) {
      return conSueloDeTiempo(inicio, NextResponse.json({ error: ERROR_GENERICO }, { status: 404 }))
    }

    const [{ data: eventos }, { data: items }] = await Promise.all([
      db
        .from('order_tracking')
        .select('estado, descripcion, numero_tracking, empresa_envio, fecha_creacion')
        .eq('order_id', order.id)
        .order('fecha_creacion', { ascending: true }),
      db
        .from('order_items')
        .select('nombre_producto, cantidad')
        .eq('order_id', order.id),
    ])

    // El id interno del pedido NO sale de aquí: no hace falta para mostrar el
    // seguimiento y es la clave de los endpoints del dashboard.
    return conSueloDeTiempo(
      inicio,
      NextResponse.json(
        {
          numeroPedido: order.numero_pedido,
          estado: order.estado,
          incidencia: order.incidencia ?? null,
          fechaCreacion: order.fecha_creacion,
          fechaActualizacion: order.fecha_actualizacion,
          eventos: eventos ?? [],
          items: (items ?? []).map((i) => ({
            nombre: i.nombre_producto,
            cantidad: i.cantidad,
          })),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    )
  } catch (err) {
    console.error('[api/seguimiento] error:', err)
    return conSueloDeTiempo(
      inicio,
      NextResponse.json({ error: 'Error interno. Inténtalo de nuevo en unos minutos.' }, { status: 500 })
    )
  }
}
