// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/orders
// Lista de pedidos para el dashboard SaaS externo — SIN datos personales
// (nombre/email/teléfono del cliente final), mismo principio que
// /api/dashboard/stats. Si se necesita el nombre de un pedido concreto, es
// GET /api/dashboard/orders/[id], que nunca se cachea en el SaaS.
//
// Paginación real (offset + total + hasMore), no un límite silencioso: una
// tienda con más pedidos que el límite en el rango pedido no debe perder
// datos sin que el consumidor se entere. total viene de un COUNT(*) exacto
// con el mismo WHERE (vía { count: 'exact' } de PostgREST), no del tamaño
// de la página devuelta.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { authenticateDashboardRequest } from '@/lib/dashboard-api-auth'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

// Mismo patrón que MAX_RANGE_DAYS en stats/route.ts y finance-series/route.ts
// — este endpoint era el único de dashboard/* sin cota de rango: from/to
// llegaban directo a .gte()/.lte() sin límite, así que un from=1900-01-01
// escaneaba (y contaba con count:'exact') todo el histórico de la tabla en
// vez de solo la página pedida. limit/offset ya acotan el tamaño de la
// respuesta, pero no el coste de la query en sí. Ver audit-saas-security.md
// §5/Fase 3.
const MAX_RANGE_DAYS = 90

const VALID_STATUSES = new Set([
  'pendiente',
  'pagado',
  'fallido',
  'procesando',
  'enviado',
  'entregado',
  'cancelado',
  'reembolsado',
])

function parseLimit(value: string | null): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.min(Math.max(1, Math.trunc(n)), MAX_LIMIT)
}

function parseOffset(value: string | null): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0
}

export async function GET(req: NextRequest) {
  const auth = await authenticateDashboardRequest(req)
  if (!auth.ok) return auth.response

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  if (from && to) {
    const fromDate = new Date(`${from}T00:00:00Z`)
    const toDate = new Date(`${to}T00:00:00Z`)
    if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
      const rangeDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000)
      if (rangeDays > MAX_RANGE_DAYS) {
        return NextResponse.json(
          { error: `El rango máximo es de ${MAX_RANGE_DAYS} días` },
          { status: 400 }
        )
      }
    }
  }

  const limit = parseLimit(searchParams.get('limit'))
  const offset = parseOffset(searchParams.get('offset'))

  try {
    const supabase = createServiceClient()

    // order_items(count): PostgREST agrega el conteo de líneas de cada
    // pedido vía la FK order_items.order_id → orders.id, sin N+1 queries
    // (una fila por pedido, con order_items como array de un solo
    // {count: N} en vez de las líneas completas — no hace falta más para
    // el conteo, y evita traer nombre_producto/precio_* que no se piden).
    let query = supabase
      .from('orders')
      .select('id, numero_pedido, estado, total, fecha_creacion, order_items(count)', {
        count: 'exact',
      })
      .order('fecha_creacion', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('estado', status)
    if (from) query = query.gte('fecha_creacion', `${from}T00:00:00Z`)
    if (to) query = query.lte('fecha_creacion', `${to}T23:59:59.999Z`)

    const { data, error, count } = await query
    if (error) throw error

    const orders = (data ?? []).map((o) => ({
      id: o.id,
      numeroPedido: o.numero_pedido,
      estado: o.estado,
      total: Number(o.total),
      fechaCreacion: o.fecha_creacion,
      itemCount: Array.isArray(o.order_items) ? Number(o.order_items[0]?.count ?? 0) : 0,
    }))

    const total = count ?? orders.length

    return NextResponse.json({
      orders,
      total,
      limit,
      offset,
      hasMore: offset + orders.length < total,
    })
  } catch (err) {
    console.error('[dashboard/orders] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
