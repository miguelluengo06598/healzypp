// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/dashboard/products/[slug]
// Ajusta el stock real de un producto (product_stock, por slug).
//
// Sustituye al antiguo toggle de "activo" contra products: desde la
// unificación del catálogo, nombre/precio/activo ya no viven en Supabase
// (products está dormante) — el único dato de catálogo que sigue siendo
// mutable y tiene sentido ajustar desde el dashboard es el stock. Body
// SOLO admite { stock: number } a propósito, igual que el toggle anterior
// solo admitía { activo: boolean } — no es un update genérico.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { authenticateDashboardRequest } from '@/lib/dashboard-api-auth'
import { getProductBySlug } from '@/data/catalog'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateDashboardRequest(req)
  if (!auth.ok) return auth.response

  const { slug } = await params
  if (!getProductBySlug(slug)) {
    return NextResponse.json({ error: 'Producto no encontrado en el catálogo' }, { status: 404 })
  }

  let body: { stock?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 })
  }

  if (typeof body.stock !== 'number' || !Number.isInteger(body.stock) || body.stock < 0) {
    return NextResponse.json({ error: 'Falta "stock" (entero >= 0).' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('product_stock')
      .upsert({ product_slug: slug, stock: body.stock }, { onConflict: 'product_slug' })
      .select('product_slug, stock')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'No se pudo actualizar el stock' }, { status: 500 })
    }

    return NextResponse.json({ slug: data.product_slug, stock: data.stock })
  } catch (err) {
    console.error('[dashboard/products/[slug]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
