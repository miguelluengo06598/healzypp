// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/stats
// Métricas agregadas para el dashboard SaaS externo (healzyp-analytics y
// cualquier instalación futura de esta plantilla). Protegido por
// Authorization: Bearer <DASHBOARD_API_TOKEN> — ver src/lib/dashboard-api-auth.ts.
//
// SOLO cifras y conteos agregados — nunca nombre, dirección, teléfono o email
// de un cliente final. El detalle de un pedido concreto (que sí incluye esos
// datos) vive aparte en GET /api/dashboard/orders/[id], para que el consumidor
// decida explícitamente cuándo lo pide y nunca lo cachee.
//
// activeNow (sesiones/página/dispositivo/país) se deriva de
// tracking_page_views (actividad reciente), nunca de
// tracking_sessions.created_at — las sesiones se reutilizan entre visitas,
// así que created_at es la fecha de la primera visita, no la actividad
// reciente. visitors/orders/topProducts se agregan en Postgres (ver
// database/SETUP-COMPLETO.sql) en vez de traer filas sueltas: una
// tienda con mucho histórico podría superar fácilmente el límite de 1000
// filas por consulta de PostgREST, y un .select() sin agregar se habría
// quedado corto en el conteo/la facturación sin ningún error visible.
//
// El rango pedido está acotado a MAX_RANGE_DAYS como segunda capa de
// protección (independiente de lo anterior): evita respuestas o queries
// caras si alguien pide años de histórico de golpe, sobre todo llamándose
// cada 15s (TTL de la cache en memoria de abajo).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { authenticateDashboardRequest } from '@/lib/dashboard-api-auth'
import { getStoreInstanceId } from '@/lib/store-instance'

export const dynamic = 'force-dynamic'

const MAX_RANGE_DAYS = 90
const ACTIVE_WINDOW_MS = 5 * 60 * 1000
const CACHE_TTL_MS = 15_000

type DailyVisitorRow = { day: string; visitors: number | string }
type OrdersByStatusRow = { estado: string; count: number | string }
type TopProductRow = {
  product_id: string | null
  nombre_producto: string
  unidades: number | string
  facturacion: number | string
}
type ActiveSessionRow = {
  id: string
  device_type: string | null
  country: string | null
  city: string | null
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** Interpreta "YYYY-MM-DD" como medianoche UTC; si falta o es inválido, usa el fallback. */
function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? fallback : d
}

// Cache en memoria por rango (15s) — varios refrescos del dashboard SaaS
// pidiendo el mismo rango en poco tiempo no golpean Supabase cada vez.
const cache = new Map<string, { data: unknown; expiresAt: number }>()

export async function GET(req: NextRequest) {
  const auth = await authenticateDashboardRequest(req)
  if (!auth.ok) return auth.response

  const instanceId = getStoreInstanceId()
  if (!instanceId) {
    console.error('[dashboard/stats] STORE_INSTANCE_ID no está configurado en .env.local')
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
  }

  const { searchParams } = req.nextUrl

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const defaultFrom = new Date(today)
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 6)

  const from = parseDateParam(searchParams.get('from'), defaultFrom)
  const to = parseDateParam(searchParams.get('to'), today)

  if (from.getTime() > to.getTime()) {
    return NextResponse.json({ error: '"from" no puede ser posterior a "to"' }, { status: 400 })
  }

  const rangeDays = Math.round((to.getTime() - from.getTime()) / 86_400_000)
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `El rango máximo es de ${MAX_RANGE_DAYS} días` },
      { status: 400 }
    )
  }

  const fromStr = toDateStr(from)
  const toStr = toDateStr(to)

  const cacheKey = `${fromStr}:${toStr}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const supabase = createServiceClient()
    const nowIso = new Date().toISOString()
    const activeSinceIso = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString()

    const [recentViewsRes, dailyVisitorsRes, ordersByStatusRes, revenueRes, topProductsRes] =
      await Promise.all([
        // Sesiones activas ahora = las que tienen al menos un page_view en los
        // últimos 5 min — NO tracking_sessions.created_at: las sesiones se
        // reutilizan entre visitas (cookie/localStorage), así que created_at
        // es la fecha de la PRIMERA visita, no la actividad reciente. Un
        // visitante recurrente con una sesión de horas nunca aparecía como
        // activo aunque estuviera navegando en ese mismo instante — bug real
        // confirmado con datos de producción (sesión con created_at de horas
        // antes y page_views vivos). ended_at tampoco filtraba nada: ningún
        // UPDATE de este repo lo escribe jamás, así que `ended_at.is.null`
        // siempre era verdadero.
        supabase
          .from('tracking_page_views')
          .select('session_id, path, created_at, tracking_sessions!inner(store_instance_id)')
          .eq('tracking_sessions.store_instance_id', instanceId)
          .gte('created_at', activeSinceIso)
          .order('created_at', { ascending: false })
          .limit(1000),

        // Visitantes por día del rango pedido.
        supabase.rpc('dashboard_daily_visitors', {
          p_since: fromStr,
          p_until: toStr,
          p_instance_id: instanceId,
        }),

        // Pedidos del rango (por fecha_creacion) agrupados por estado — cuenta
        // total = suma de los grupos, sin exponer ningún dato personal.
        supabase.rpc('dashboard_orders_by_status', { p_since: fromStr, p_until: toStr }),

        // Facturación de pedidos PAGADOS en el rango (por fecha_actualizacion,
        // mismo criterio que la página Financiera).
        supabase.rpc('dashboard_paid_revenue', { p_since: fromStr, p_until: toStr }),

        // Top 10 productos por facturación entre pedidos pagados del rango.
        supabase.rpc('dashboard_top_products', { p_since: fromStr, p_until: toStr, p_limit: 10 }),
      ])

    const firstError =
      recentViewsRes.error ??
      dailyVisitorsRes.error ??
      ordersByStatusRes.error ??
      revenueRes.error ??
      topProductsRes.error
    if (firstError) throw firstError

    // ─── Sesiones activas ahora + desglose por página ────────────────────────
    // Una sola query cubre ambos: cada fila de recentViewsRes ya es
    // "sesión activa + su página", no hace falta una segunda consulta.
    const recentViews = recentViewsRes.data ?? []

    const latestPathBySession = new Map<string, string>()
    for (const row of recentViews) {
      if (!latestPathBySession.has(row.session_id)) {
        latestPathBySession.set(row.session_id, row.path)
      }
    }
    const activeSessionIds = Array.from(latestPathBySession.keys())

    const pageCounts = new Map<string, number>()
    for (const path of latestPathBySession.values()) {
      pageCounts.set(path, (pageCounts.get(path) ?? 0) + 1)
    }
    const activeByPage = Array.from(pageCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)

    // ─── Dispositivo/país de esas mismas sesiones ────────────────────────────
    // Sin filtro de store_instance_id aquí: activeSessionIds ya viene
    // exclusivamente de sesiones que pasaron ese filtro en la query de
    // page_views de arriba (join !inner) — repetirlo sería redundante.
    let activeSessionRows: ActiveSessionRow[] = []
    if (activeSessionIds.length > 0) {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .select('id, device_type, country, city')
        .in('id', activeSessionIds)
      if (error) throw error
      activeSessionRows = (data ?? []) as ActiveSessionRow[]
    }

    const deviceCounts = new Map<string, number>()
    for (const row of activeSessionRows) {
      const device = row.device_type ?? 'unknown'
      deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1)
    }
    const activeByDevice = Array.from(deviceCounts.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count)

    let withoutCountry = 0
    const countryEntries = new Map<string, { count: number; cities: Map<string, number> }>()
    for (const row of activeSessionRows) {
      if (!row.country) {
        withoutCountry++
        continue
      }
      const entry = countryEntries.get(row.country) ?? { count: 0, cities: new Map<string, number>() }
      entry.count++
      if (row.city) entry.cities.set(row.city, (entry.cities.get(row.city) ?? 0) + 1)
      countryEntries.set(row.country, entry)
    }
    const activeByCountry = Array.from(countryEntries.entries())
      .map(([country, { count, cities }]) => ({
        country,
        count,
        cities: Array.from(cities.entries())
          .map(([city, cityCount]) => ({ city, count: cityCount }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count)

    // ─── Visitantes por día ───────────────────────────────────────────────────
    const visitorsByDay = ((dailyVisitorsRes.data ?? []) as DailyVisitorRow[]).map((r) => ({
      day: r.day,
      visitors: Number(r.visitors),
    }))
    const visitorsTotal = visitorsByDay.reduce((sum, r) => sum + r.visitors, 0)

    // ─── Pedidos del rango, agregados en Postgres (por fecha de creación) ────
    const byStatus = ((ordersByStatusRes.data ?? []) as OrdersByStatusRow[]).map((r) => ({
      estado: r.estado,
      count: Number(r.count),
    }))
    const ordersCount = byStatus.reduce((sum, r) => sum + r.count, 0)

    // ─── Facturación (pedidos pagados, por fecha de pago) ────────────────────
    const totalRevenue = Number(revenueRes.data ?? 0)

    // ─── Top productos (pedidos pagados, por fecha de pago) ──────────────────
    const topProducts = ((topProductsRes.data ?? []) as TopProductRow[]).map((r) => ({
      productId: r.product_id,
      name: r.nombre_producto,
      unitsSold: Number(r.unidades),
      revenue: Number(r.facturacion),
    }))

    const response = {
      range: { from: fromStr, to: toStr },
      activeNow: {
        sessions: activeSessionIds.length,
        byPage: activeByPage,
        byDevice: activeByDevice,
        byCountry: activeByCountry,
        withoutCountry,
      },
      visitors: {
        total: visitorsTotal,
        byDay: visitorsByDay,
      },
      orders: {
        count: ordersCount,
        byStatus,
        totalRevenue,
      },
      topProducts,
      generatedAt: nowIso,
    }

    cache.set(cacheKey, { data: response, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(response, { headers: { 'X-Cache': 'MISS' } })
  } catch (err) {
    console.error('[dashboard/stats] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
