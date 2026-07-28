// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/products
// Catálogo completo (productos + bundles) para el dashboard SaaS externo.
//
// Desde la unificación del catálogo, nombre/precio/imágenes/etc. vienen de
// src/data/catalog.ts (código, no Supabase) — este endpoint los combina con
// el ÚNICO dato de catálogo que sigue en Supabase: el stock real
// (product_stock, por slug). Sin problema de PII ni de volumen — un
// catálogo no crece sin límite como el histórico de pedidos.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { authenticateDashboardRequest } from '@/lib/dashboard-api-auth'
import { CATALOG } from '@/data/catalog'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateDashboardRequest(req)
  if (!auth.ok) return auth.response

  try {
    const supabase = createServiceClient()

    const { data: stockRows, error: stockError } = await supabase
      .from('product_stock')
      .select('product_slug, stock')

    if (stockError) throw stockError

    const stockBySlug = new Map((stockRows ?? []).map((r) => [r.product_slug, r.stock]))

    const productsOut = CATALOG.map((p) => ({
      id: p.id,
      slug: p.slug,
      nombre: p.nombre,
      categoria: p.categoria,
      // Precio de entrada (bundle más barato) — cifra única de referencia,
      // el desglose real está en `bundles` abajo.
      precio: p.bundles[0]?.precio ?? null,
      stock: stockBySlug.get(p.slug) ?? 0,
    }))

    const bundlesOut = CATALOG.flatMap((p) =>
      p.bundles.map((b) => ({
        id: b.id,
        productSlug: p.slug,
        productNombre: p.nombre,
        nombre: b.nombre,
        cantidad: b.cantidad,
        precio: b.precio,
        precioOriginal: b.precioOriginal ?? null,
        popular: b.popular ?? false,
      }))
    )

    return NextResponse.json({ products: productsOut, bundles: bundlesOut })
  } catch (err) {
    console.error('[dashboard/products] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
