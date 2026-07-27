// Contenido por defecto de la tienda para BundleSelection.
// Punto de adaptación: reescribir estos títulos (o la fuente BUNDLES en
// @/lib/bundles) en otro proyecto, sin tocar index.tsx.

import type { Bundle } from "@/lib/bundles";

/** Clave de localStorage donde se persiste el bundle elegido — la leen
 *  CheckoutActions/OrderSummary vía getStoredBundle(). No renombrar sin
 *  actualizar a esos lectores. */
export const SELECTED_BUNDLE_STORAGE_KEY = "selectedBundle";

export function getBundleTitle(bundle: Bundle): string {
  if (bundle.id === 1) return "1 Bote — Pruébalo";
  if (bundle.id === 2) return "2 Botes — Lo más vendido ⭐";
  if (bundle.id === 3) return "3 Botes — Mejor precio 🏆";
  return bundle.name;
}
