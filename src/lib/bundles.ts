// Datos de bundles compartidos entre servidor y cliente.
// Sin "use client" ni "use server" para que sea importable desde ambos contextos.
//
// ADAPTADOR DE FORMA — sin datos propios. Deriva de src/data/catalog.ts para
// mantener la forma `Bundle` que ya esperan los componentes de UI, sin tener
// que reescribirlos todos. NO edites precios aquí: no tendría efecto en lo que
// se cobra. Edita src/data/catalog.ts.
//
// Cada Bundle lleva su `productSlug`, así que los cálculos de ahorro y precio
// tachado se resuelven contra SU producto. Antes salían de un
// BASE_UNIT_PRICE_EUR global (el del primer producto del catálogo), lo que con
// más de un producto daba cifras de otro producto.

import {
  getProductBySlug,
  getBundleDisplayName,
  type CatalogProduct,
  type CatalogBundle,
} from "@/data/catalog";

export type Bundle = {
  /** Identificador único en todo el catálogo — ver src/data/catalog.ts */
  sku: string;
  /** Producto al que pertenece este pack. Necesario para que los cálculos no
   *  se hagan contra el producto equivocado. */
  productSlug: string;
  /** Identificador externo (content_id de Meta). No usar para resolver. */
  id: number;
  cantidad: number;
  /** Nombre corto del pack: "2 Botes" */
  name: string;
  /** Nombre cualificado para carrito y resúmenes: "Gominolas de Jengibre — 2 Botes" */
  displayName: string;
  price: string;
  priceInCents: number;
  /** Precio tachado, si el catálogo lo define explícitamente. */
  priceOriginalInCents?: number;
  popular: boolean;
};

function toBundle(producto: CatalogProduct, b: CatalogBundle): Bundle {
  return {
    sku: b.sku,
    productSlug: producto.slug,
    id: b.id,
    cantidad: b.cantidad,
    name: b.nombre,
    displayName: getBundleDisplayName(producto, b),
    price: `${b.precio.toFixed(2).replace(".", ",")}€`,
    priceInCents: Math.round(b.precio * 100),
    ...(b.precioOriginal !== undefined
      ? { priceOriginalInCents: Math.round(b.precioOriginal * 100) }
      : {}),
    popular: b.popular ?? false,
  };
}

/** Bundles de un producto concreto. Devuelve [] si el slug no existe. */
export function getBundlesForProduct(productSlug: string): Bundle[] {
  const producto = getProductBySlug(productSlug);
  if (!producto) return [];
  return producto.bundles.map((b) => toBundle(producto, b));
}

/** Precio unitario de referencia (pack de 1 unidad) DE ESE producto — base
 *  para calcular ahorro y % de descuento. */
export function getBaseUnitPriceEur(productSlug: string): number {
  const producto = getProductBySlug(productSlug);
  if (!producto) return 0;
  const packDeUno = producto.bundles.find((b) => b.cantidad === 1);
  return packDeUno?.precio ?? producto.bundles[0]?.precio ?? 0;
}

/** Precio tachado en euros: el `precioOriginal` del catálogo si existe; si no,
 *  el precio unitario del producto × unidades del pack.
 *
 *  Sustituye a las fórmulas `BASE_UNIT_PRICE_EUR * bundle.id` y `29.99 *
 *  bundle.id` que había repartidas por la UI, que usaban el id como si fuera
 *  la cantidad y el precio del primer producto del catálogo como si fuera el
 *  de todos. */
export function getStrikePriceEur(bundle: Bundle): number {
  if (bundle.priceOriginalInCents !== undefined) {
    return bundle.priceOriginalInCents / 100;
  }
  return getBaseUnitPriceEur(bundle.productSlug) * bundle.cantidad;
}

/** Cantidad de unidades por bundle */
export function getBundleQuantity(bundle: Bundle): number {
  return bundle.cantidad;
}

/** Precio del bundle en euros (desde cents) */
export function getBundlePriceEur(bundle: Bundle): number {
  return bundle.priceInCents / 100;
}

/** Ahorro absoluto respecto al precio tachado */
export function calcSavings(bundle: Bundle): number {
  const strike = getStrikePriceEur(bundle);
  const bundlePrice = getBundlePriceEur(bundle);
  return Math.max(0, Math.round((strike - bundlePrice) * 100) / 100);
}

/** Porcentaje de descuento del bundle */
export function calcDiscountPct(bundle: Bundle): number {
  const strike = getStrikePriceEur(bundle);
  const bundlePrice = getBundlePriceEur(bundle);
  if (strike <= 0) return 0;
  return Math.round(((strike - bundlePrice) / strike) * 100);
}

/** Precio unitario efectivo dentro del bundle */
export function calcUnitPrice(bundle: Bundle): number {
  const qty = getBundleQuantity(bundle);
  if (qty <= 0) return 0;
  return Math.round((getBundlePriceEur(bundle) / qty) * 100) / 100;
}

/** Formatea número a string con 2 decimales y coma decimal (es-ES) */
export function formatPriceEur(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

// BUNDLES y BASE_UNIT_PRICE_EUR se eliminaron: derivaban de CATALOG[0], así
// que cualquier producto que no fuera el primero del catálogo mostraba y
// cobraba los packs de otro. Usa getBundlesForProduct(slug) y
// getBaseUnitPriceEur(slug).
