// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO — ÚNICA fuente de verdad de productos, packs y PRECIOS.
//
// Este archivo se lee tanto para MOSTRAR precio (catálogo, ficha de
// producto, home) como para VERIFICARLO al cobrar (los dos endpoints de
// create-payment-intent). Es la razón de ser de este archivo: antes había
// dos precios que podían divergir (el mock que veía el cliente y la fila
// de Supabase que se cobraba); ahora solo hay uno, así que divergir es
// imposible por construcción. Si tocas un precio, edítalo AQUÍ — nunca en
// src/data/products.ts ni src/lib/bundles.ts, que ahora son solo
// adaptadores de forma (misma data, sin copia propia) para no romper los
// componentes de UI que ya esperan esas formas.
//
// El STOCK real (mutable, cambia con cada venta) NO vive aquí — vive en la
// tabla product_stock de Supabase, indexada por `slug`, y la actualiza
// exclusivamente el webhook de Stripe al confirmar un pago. Ver
// database/SETUP-COMPLETO.sql sección "PRODUCT_STOCK".
//
// `id` es un entero fijo elegido a mano en este archivo (NUNCA generado
// por una base de datos) — no cambia entre entornos ni al reiniciar
// Supabase. `slug` es el identificador estable que cruza con product_stock
// y con las URLs de producto (/shop/product/<id>/<slug>).
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalogBundle {
  /** Entero fijo (no autogenerado). Coincide con `cantidad` por convención
   *  actual del proyecto (1/2/3 botes = id 1/2/3), pero son campos
   *  independientes — no asumas que siempre coincidirán. */
  id: number
  /** Unidades reales que contiene este pack (botes). Es lo que se
   *  descuenta de product_stock al confirmarse el pago. */
  cantidad: number
  nombre: string
  /** Precio real en euros — el número que se cobra en Stripe. */
  precio: number
  /** Precio "antes de descuento" para mostrar tachado. Omitir si el pack
   *  no muestra descuento (p.ej. el pack de 1 unidad). */
  precioOriginal?: number
  popular?: boolean
}

export interface CatalogProduct {
  /** Entero fijo (no autogenerado) — usado en la URL /shop/product/<id>/... */
  id: number
  /** Identificador estable, minúsculas y guiones — clave de product_stock. */
  slug: string
  nombre: string
  descripcion: string
  descripcionCorta: string
  /** Rutas a /public/images/... — la primera es la imagen principal. */
  imagenes: string[]
  categoria: string
  metaTitle: string
  metaDescription: string
  bundles: CatalogBundle[]
}

export const CATALOG: CatalogProduct[] = [
  {
    id: 1,
    slug: "gominolas-vinagre-manzana",
    nombre: "Gominolas de Vinagre de Manzana",
    descripcion:
      "Gominolas naturales elaboradas con vinagre de manzana orgánico. Mejoran la digestión, controlan el apetito y aportan energía. 60 unidades por bote. Aptas para veganos y sin gluten.",
    descripcionCorta: "60 gominolas de vinagre de manzana orgánico. Digestión + energía.",
    imagenes: ["/images/FL1.png", "/images/FL2.png", "/images/FL3.png", "/images/FL4.png"],
    categoria: "Suplementos",
    metaTitle: "Gominolas de Vinagre de Manzana | Natural y Vegano",
    metaDescription:
      "Compra gominolas de vinagre de manzana orgánico. Mejora tu digestión de forma natural. Envío gratis.",
    bundles: [
      { id: 1, cantidad: 1, nombre: "1 Bote", precio: 29.99, popular: false },
      { id: 2, cantidad: 2, nombre: "2 Botes", precio: 49.99, precioOriginal: 59.98, popular: true },
      { id: 3, cantidad: 3, nombre: "3 Botes", precio: 59.99, precioOriginal: 89.97, popular: false },
    ],
  },
]

// ─── Helpers de búsqueda — usar estos, no recorrer CATALOG a mano ──────────

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return CATALOG.find((p) => p.slug === slug)
}

export function getProductById(id: number): CatalogProduct | undefined {
  return CATALOG.find((p) => p.id === id)
}

export function findBundleById(productId: number, bundleId: number): CatalogBundle | undefined {
  return getProductById(productId)?.bundles.find((b) => b.id === bundleId)
}

/** Busca un bundle por su id en TODO el catálogo, sin conocer de antemano
 *  el producto — usado por el flujo de "Comprar ahora" (un solo bundle),
 *  que históricamente trataba bundle.id como único entre TODOS los
 *  productos (igual que bundles.id en Supabase). Con un solo producto hoy
 *  no hay colisión posible; si añades un segundo producto, evita repetir
 *  ids de bundle entre productos o esta función devolverá el primero que
 *  encuentre. */
export function findBundleByIdAcrossCatalog(
  bundleId: number
): { product: CatalogProduct; bundle: CatalogBundle } | undefined {
  for (const product of CATALOG) {
    const bundle = product.bundles.find((b) => b.id === bundleId)
    if (bundle) return { product, bundle }
  }
  return undefined
}

/** Busca un bundle por nombre en TODO el catálogo (no solo un producto) —
 *  usado por el checkout de carrito, que solo tiene el nombre del bundle
 *  (p.ej. "2 Botes") como dato fiable del item, no un id de producto. */
export function findBundleByNameAcrossCatalog(
  bundleName: string
): { product: CatalogProduct; bundle: CatalogBundle } | undefined {
  for (const product of CATALOG) {
    const bundle = product.bundles.find((b) => b.nombre === bundleName)
    if (bundle) return { product, bundle }
  }
  return undefined
}
