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
  /** Identificador ÚNICO en todo el catálogo y ÚNICA forma correcta de
   *  resolver qué se está comprando (carrito y "comprar ahora").
   *
   *  Convención: `<product-slug>-x<cantidad>`. Se escribe A MANO, nunca se
   *  deriva: acaba grabado en filas de order_items que ya no se pueden
   *  reescribir, así que si se calculara a partir de `slug` o `cantidad`,
   *  editar cualquiera de esos campos cambiaría en silencio el identificador
   *  de un bundle ya vendido. */
  sku: string
  /** Entero fijo (no autogenerado). Coincide con `cantidad` por convención
   *  actual del proyecto (1/2/3 botes = id 1/2/3), pero son campos
   *  independientes — no asumas que siempre coincidirán.
   *
   *  Sigue siendo un identificador EXTERNO con significado: es lo que se
   *  envía a Meta como content_id, así que debe ser único en TODO el
   *  catálogo, no solo dentro de su producto. Para resolver internamente
   *  usa `sku`, no esto. */
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
  /** Reclamos cortos bajo el título de la ficha ("100% veganas", …). Son
   *  específicos de cada producto: si se omiten, la ficha cae a una lista
   *  genérica que NO afirma nada sobre el ingrediente principal. */
  beneficios?: string[]
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
    beneficios: [
      "Con vinagre de manzana",
      "100% veganas",
      "Sin azúcares añadidos",
      "Favorece la digestión",
      "Apoya el bienestar",
      "Sabor delicioso",
    ],
    bundles: [
      { sku: "gominolas-vinagre-manzana-x1", id: 1, cantidad: 1, nombre: "1 Bote", precio: 29.99, popular: false },
      { sku: "gominolas-vinagre-manzana-x2", id: 2, cantidad: 2, nombre: "2 Botes", precio: 49.99, precioOriginal: 59.98, popular: true },
      { sku: "gominolas-vinagre-manzana-x3", id: 3, cantidad: 3, nombre: "3 Botes", precio: 59.99, precioOriginal: 89.97, popular: false },
    ],
  },
  {
    id: 2,
    slug: "gominolas-jengibre",
    nombre: "Gominolas de Jengibre",
    descripcion:
      "Gominolas naturales elaboradas con jengibre. Favorecen la digestión, ayudan a reducir la sensación de pesadez y aportan energía a lo largo del día. 60 unidades por bote. Aptas para veganos y sin gluten.",
    descripcionCorta: "60 gominolas de jengibre natural, digestión y energía.",
    // PLACEHOLDER: reutiliza la imagen del producto de vinagre porque todavía
    // no hay fotos reales de jengibre en public/images/. Sustituir en cuanto
    // existan — hoy la ficha muestra el bote equivocado.
    imagenes: ["/images/FL1.png"],
    categoria: "Suplementos",
    metaTitle: "Gominolas de Jengibre | Natural y Vegano",
    metaDescription:
      "Compra gominolas de jengibre natural. Favorecen la digestión y aportan energía. Envío gratis.",
    // PLACEHOLDER, igual que la descripción y la imagen: reclamos calcados del
    // producto de vinagre. Revisar antes de publicar nada de verdad.
    beneficios: [
      "Con jengibre natural",
      "100% veganas",
      "Sin azúcares añadidos",
      "Favorece la digestión",
      "Apoya el bienestar",
      "Sabor delicioso",
    ],
    bundles: [
      { sku: "gominolas-jengibre-x1", id: 4, cantidad: 1, nombre: "1 Bote", precio: 24.99, popular: false },
      { sku: "gominolas-jengibre-x2", id: 5, cantidad: 2, nombre: "2 Botes", precio: 44.99, precioOriginal: 49.98, popular: true },
      { sku: "gominolas-jengibre-x3", id: 6, cantidad: 3, nombre: "3 Botes", precio: 59.99, precioOriginal: 74.97, popular: false },
    ],
  },
]

// ─── Validación de unicidad — se ejecuta al importar el módulo ─────────────
// Falla ruidosamente en cuanto se añade un identificador repetido, en vez de
// dejar que la tienda cobre el producto equivocado en silencio. Es exactamente
// el fallo que tuvimos: con dos productos cuyos bundles se llamaban igual
// ("2 Botes"), comprar el pack del jengibre resolvía al del vinagre — se
// cobraban 49,99€ en vez de 44,99€ y se descontaba stock del producto que no
// era.
//
// El `id` de bundle entra en la comprobación aunque ya no se use para
// resolver: viaja a Meta como content_id, así que dos bundles con el mismo id
// serían el mismo producto a ojos de Meta (ver
// docs/diseno-catalogo-multi-producto.md, Decisión 1).

function assertSinDuplicados(valores: (string | number)[], que: string): void {
  const vistos = new Set<string | number>()
  const repetidos = new Set<string | number>()
  for (const valor of valores) {
    if (vistos.has(valor)) repetidos.add(valor)
    vistos.add(valor)
  }
  if (repetidos.size > 0) {
    throw new Error(
      `[catalog] ${que} repetido(s): ${[...repetidos].join(", ")}. ` +
        `Cada uno debe ser único en todo CATALOG.`
    )
  }
}

const TODOS_LOS_BUNDLES = CATALOG.flatMap((p) => p.bundles)
assertSinDuplicados(TODOS_LOS_BUNDLES.map((b) => b.sku), "sku de bundle")
assertSinDuplicados(TODOS_LOS_BUNDLES.map((b) => b.id), "id de bundle")
assertSinDuplicados(CATALOG.map((p) => p.slug), "slug de producto")
assertSinDuplicados(CATALOG.map((p) => p.id), "id de producto")

// ─── Helpers de búsqueda — usar estos, no recorrer CATALOG a mano ──────────

/** Resuelve un bundle por su `sku`. ÚNICA forma correcta de saber qué se está
 *  comprando: sustituye a findBundleByNameAcrossCatalog (que resolvía por un
 *  nombre repetido entre productos, devolviendo la primera coincidencia) y a
 *  findBundleByIdAcrossCatalog. */
export function findBundleBySku(
  sku: string
): { product: CatalogProduct; bundle: CatalogBundle } | undefined {
  for (const product of CATALOG) {
    const bundle = product.bundles.find((b) => b.sku === sku)
    if (bundle) return { product, bundle }
  }
  return undefined
}

/** Nombre cualificado para carrito y resúmenes de pedido:
 *  "Gominolas de Jengibre — 2 Botes". Derivado a propósito, nunca escrito a
 *  mano en el catálogo: duplicar el nombre del producto en cada bundle haría
 *  que renombrar el producto dejase los bundles desincronizados, y eso se ve
 *  en el carrito del cliente. */
export function getBundleDisplayName(
  producto: CatalogProduct,
  bundle: CatalogBundle
): string {
  return `${producto.nombre} — ${bundle.nombre}`
}

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
