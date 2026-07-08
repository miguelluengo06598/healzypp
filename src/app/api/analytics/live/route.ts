// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/live
// Devuelve métricas en tiempo real para dashboards.
// Cache corto (5s) para no saturar Supabase.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { analyticsRatelimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Cache en memoria por 5 segundos
let cache: {
  data: unknown
  expiresAt: number
} | null = null

export async function GET(req: NextRequest) {
  // Rate limit: 30 peticiones por IP por minuto (Upstash Redis)
  const ip = getClientIp(req)
  const { success: allowed, remaining } = await analyticsRatelimit.limit(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } })
  }

  // Devolver cache si es válido
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data, {
      headers: {
        'X-RateLimit-Remaining': String(remaining),
        'X-Cache': 'HIT',
      },
    })
  }

  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // ─── Sesiones activas (últimos 5 min) ────────────────────────────────────
    const { data: activeSessionsRaw, error: sessionsError } = await supabase
      .from('tracking_sessions')
      .select('id, user_id, device_type')
      .gte('created_at', fiveMinutesAgo)
      .or(`ended_at.is.null,ended_at.gte.${fiveMinutesAgo}`)

    if (sessionsError) throw sessionsError

    const activeSessions = activeSessionsRaw?.length ?? 0
    const authenticatedUsers =
      activeSessionsRaw?.filter((s) => s.user_id != null).length ?? 0
    const mobileSessions =
      activeSessionsRaw?.filter((s) => s.device_type === 'mobile').length ?? 0
    const desktopSessions =
      activeSessionsRaw?.filter((s) => s.device_type === 'desktop').length ?? 0

    // ─── Top páginas (últimos 5 min) ─────────────────────────────────────────
    const { data: topPagesRaw, error: pagesError } = await supabase
      .from('tracking_page_views')
      .select('path, created_at')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(200)

    if (pagesError) throw pagesError

    const pageCounts = new Map<string, { count: number; lastView: string }>()
    for (const row of topPagesRaw ?? []) {
      const existing = pageCounts.get(row.path)
      if (existing) {
        existing.count++
        if (row.created_at > existing.lastView) existing.lastView = row.created_at
      } else {
        pageCounts.set(row.path, { count: 1, lastView: row.created_at })
      }
    }
    const topPages = Array.from(pageCounts.entries())
      .map(([path, { count, lastView }]) => ({ path, viewCount: count, lastView }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10)

    // ─── Top productos hoy ───────────────────────────────────────────────────
    const { data: topProductsRaw, error: productsError } = await supabase
      .from('tracking_product_views')
      .select('product_id, product_slug, duration_seconds')
      .gte('created_at', todayStart.toISOString())

    if (productsError) throw productsError

    const productMap = new Map<
      number,
      { productId: number; productSlug: string; views: number; totalDuration: number }
    >()
    for (const row of topProductsRaw ?? []) {
      const existing = productMap.get(row.product_id)
      if (existing) {
        existing.views++
        existing.totalDuration += row.duration_seconds ?? 0
      } else {
        productMap.set(row.product_id, {
          productId: row.product_id,
          productSlug: row.product_slug,
          views: 1,
          totalDuration: row.duration_seconds ?? 0,
        })
      }
    }
    const topProducts = Array.from(productMap.values())
      .map((p) => ({
        productId: p.productId,
        productSlug: p.productSlug,
        viewCount: p.views,
        avgDuration: Math.round(p.totalDuration / p.views),
      }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10)

    // ─── Funnel hoy ──────────────────────────────────────────────────────────
    const [sessionsRes, productViewsRes, cartsRes, checkoutsRes, conversionsRes] =
      await Promise.all([
        supabase.from('tracking_sessions').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('tracking_product_views').select('session_id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('tracking_cart_actions').select('session_id', { count: 'exact', head: true }).eq('action', 'add').gte('created_at', todayStart.toISOString()),
        supabase.from('tracking_checkouts').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('tracking_conversions').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      ])

    const funnel = {
      sessions: sessionsRes.count ?? 0,
      productViews: productViewsRes.count ?? 0,
      addToCarts: cartsRes.count ?? 0,
      checkouts: checkoutsRes.count ?? 0,
      conversions: conversionsRes.count ?? 0,
    }

    const response = {
      activeSessions,
      authenticatedUsers,
      mobileSessions,
      desktopSessions,
      topPages,
      topProducts,
      funnel,
      generatedAt: now,
    }

    cache = { data: response, expiresAt: Date.now() + 5000 }

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Remaining': String(remaining),
        'X-Cache': 'MISS',
      },
    })
  } catch (err) {
    console.error('[analytics/live] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
