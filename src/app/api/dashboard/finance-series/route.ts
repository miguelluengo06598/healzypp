// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/finance-series
// Serie temporal de ingresos (pedidos pagados) agrupada por día/semana/mes,
// para el gráfico de la página Financiera. SOLO ingresos: los gastos
// manuales (dashboard_expenses) ya no viven en la Supabase de la tienda —
// se movieron a la Supabase del dashboard SaaS con store_id (ver
// healzyp-analytics/database/saas-schema-002-expenses.sql), así que el
// dashboard los lee directamente ahí, sin pasar por esta API.
//
// Agregado en Postgres (dashboard_revenue_series, ver
// database/SETUP-COMPLETO.sql) — mismo motivo que el resto de
// funciones dashboard_*: el resultado son como mucho ~366/52/12 filas según
// el periodo, nunca crece con el volumen de pedidos.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { authenticateDashboardRequest } from '@/lib/dashboard-api-auth'

export const dynamic = 'force-dynamic'

// A diferencia de MAX_RANGE_DAYS en /api/dashboard/stats (90), aquí el
// tamaño de la respuesta no depende del rango — sigue siendo un puñado de
// buckets agregados. 366 solo evita escanear décadas de histórico de golpe;
// coincide con el "últimos 12 meses" que ya pedía por defecto la página
// Financiera.
const MAX_RANGE_DAYS = 366
const VALID_PERIODS = new Set(['day', 'week', 'month'])

type RevenueSeriesRow = { bucket: string; ingresos: number | string }

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? fallback : d
}

export async function GET(req: NextRequest) {
  const auth = await authenticateDashboardRequest(req)
  if (!auth.ok) return auth.response

  const { searchParams } = req.nextUrl
  const period = searchParams.get('period') ?? 'month'
  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json({ error: 'period debe ser day, week o month' }, { status: 400 })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const defaultFrom = new Date(today)
  defaultFrom.setUTCMonth(defaultFrom.getUTCMonth() - 12)

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

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('dashboard_revenue_series', {
      p_since: fromStr,
      p_until: toStr,
      p_period: period,
    })

    if (error) throw error

    const series = ((data ?? []) as RevenueSeriesRow[]).map((r) => ({
      bucket: r.bucket,
      ingresos: Number(r.ingresos),
    }))

    return NextResponse.json({ period, range: { from: fromStr, to: toStr }, series })
  } catch (err) {
    console.error('[dashboard/finance-series] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
