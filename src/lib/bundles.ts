// Datos de bundles compartidos entre servidor y cliente.
// Sin "use client" ni "use server" para que sea importable desde ambos contextos.
//
// ADAPTADOR DE FORMA — sin datos propios. Deriva de src/data/catalog.ts
// (producto único, CATALOG[0]) para mantener la forma `Bundle` que ya
// esperan ~14 componentes de la UI, sin tener que reescribirlos todos.
// NO edites precios aquí: no tendría efecto en lo que se cobra. Edita
// src/data/catalog.ts.

import { CATALOG } from "@/data/catalog";

export type Bundle = {
  id: number;
  cantidad: number;
  name: string;
  price: string;
  priceInCents: number;
  popular: boolean;
};

const catalogBundles = CATALOG[0].bundles;

export const BUNDLES: Bundle[] = catalogBundles.map((b) => ({
  id: b.id,
  cantidad: b.cantidad,
  name: b.nombre,
  price: `${b.precio.toFixed(2).replace(".", ",")}€`,
  priceInCents: Math.round(b.precio * 100),
  popular: b.popular ?? false,
}));

/** Precio unitario de referencia (pack de 1) — usado para calcular ahorro/% de descuento. */
export const BASE_UNIT_PRICE_EUR =
  catalogBundles.find((b) => b.cantidad === 1)?.precio ?? catalogBundles[0].precio;

/** Cantidad de unidades por bundle */
export function getBundleQuantity(bundle: Bundle): number {
  return bundle.cantidad;
}

/** Precio del bundle en euros (desde cents) */
export function getBundlePriceEur(bundle: Bundle): number {
  return bundle.priceInCents / 100;
}

/** Ahorro absoluto respecto a comprar unidades sueltas a precio base */
export function calcSavings(bundle: Bundle): number {
  const qty = getBundleQuantity(bundle);
  const totalIfUnit = BASE_UNIT_PRICE_EUR * qty;
  const bundlePrice = getBundlePriceEur(bundle);
  return Math.max(0, Math.round((totalIfUnit - bundlePrice) * 100) / 100);
}

/** Porcentaje de descuento del bundle */
export function calcDiscountPct(bundle: Bundle): number {
  const qty = getBundleQuantity(bundle);
  const totalIfUnit = BASE_UNIT_PRICE_EUR * qty;
  const bundlePrice = getBundlePriceEur(bundle);
  if (totalIfUnit <= 0) return 0;
  return Math.round(((totalIfUnit - bundlePrice) / totalIfUnit) * 100);
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
