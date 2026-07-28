// Contenido por defecto de la tienda para ProductHeader.
// Punto de adaptación: reescribir este archivo (o pasar props) en otro
// proyecto, sin tocar index.tsx.

import { getProductBySlug } from "@/data/catalog";

/** Reclamos genéricos, sin afirmar nada sobre el ingrediente principal. Solo
 *  se usan si el producto no define los suyos en catalog.ts.
 *
 *  Antes esta lista incluía "Con vinagre de manzana" y era el default para
 *  CUALQUIER producto, así que la ficha de un producto nuevo anunciaba el
 *  ingrediente de otro. */
export const defaultBenefitBubbles: string[] = [
  "100% veganas",
  "Sin azúcares añadidos",
  "Favorece la digestión",
  "Apoya el bienestar",
  "Sabor delicioso",
];

/** Reclamos del producto indicado; los genéricos si no define ninguno. */
export function getBenefitBubbles(productSlug: string): string[] {
  return getProductBySlug(productSlug)?.beneficios ?? defaultBenefitBubbles;
}
