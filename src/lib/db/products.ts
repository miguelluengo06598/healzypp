// ─────────────────────────────────────────────────────────────────────────────
// Lectura de productos reales desde Supabase (tabla `products`).
// Reemplaza src/data/products.ts (mock) para catálogo, ficha y home.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '@/lib/supabase'
import type { ProductRow } from '@/types/database.types'
import type { Discount, Product } from '@/types/product.types'

export function mapRowToProduct(row: ProductRow): Product {
  const precio = Number(row.precio)
  const precioOriginal = row.precio_original != null ? Number(row.precio_original) : null
  const imagenes: string[] = Array.isArray(row.imagenes) ? row.imagenes : []
  const tags: string[] = Array.isArray(row.tags) ? row.tags : []

  const discount: Discount =
    precioOriginal && precioOriginal > precio
      ? {
          amount: Math.round((precioOriginal - precio) * 100) / 100,
          percentage: Math.round(((precioOriginal - precio) / precioOriginal) * 100),
        }
      : { amount: 0, percentage: 0 }

  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    descripcion: row.descripcion,
    descripcion_corta: row.descripcion_corta,
    precio,
    precio_original: precioOriginal,
    imagenes,
    categoria: row.categoria,
    tags,
    stock: row.stock,
    activo: row.activo,
    meta_title: row.meta_title,
    meta_description: row.meta_description,

    title: row.nombre,
    srcUrl: imagenes[0] ?? '',
    gallery: imagenes,
    price: precio,
    discount,
    badge: discount.percentage > 0 ? 'sale' : null,

    rating: undefined,
    reviewsCount: undefined,
    location: undefined,
    colors: undefined,
    sizes: undefined,
  }
}

export async function getActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false })

  if (error || !data) {
    console.error('[getActiveProducts]', error)
    return []
  }

  return (data as ProductRow[]).map(mapRowToProduct)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle()

  if (error || !data) return null

  return mapRowToProduct(data as ProductRow)
}
