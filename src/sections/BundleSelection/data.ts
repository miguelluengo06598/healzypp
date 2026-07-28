// Contenido por defecto de la tienda para BundleSelection.
// Punto de adaptación: reescribir estos títulos en otro proyecto, sin tocar
// index.tsx.

import type { Bundle } from "@/lib/bundles";

/** Título comercial del pack. Se deriva de los datos del propio pack y de sus
 *  hermanos, no de ids fijos: antes era `if (bundle.id === 1) …` con los ids
 *  1/2/3 escritos a mano, así que cualquier producto que no usara justo esos
 *  ids se quedaba sin título (y un producto nuevo mostraba los del primero). */
export function getBundleTitle(bundle: Bundle, bundles: Bundle[]): string {
  const maxCantidad = Math.max(...bundles.map((b) => b.cantidad));

  if (bundle.popular) return `${bundle.name} — Lo más vendido ⭐`;
  if (bundles.length > 1 && bundle.cantidad === maxCantidad) {
    return `${bundle.name} — Mejor precio 🏆`;
  }
  if (bundle.cantidad === 1) return `${bundle.name} — Pruébalo`;
  return bundle.name;
}
