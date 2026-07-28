// Importamos desde el módulo compartido (los re-exports de tipo no están disponibles
// en el scope del fichero — hay que importar explícitamente para usarlos aquí abajo).
import { BUNDLES, getBundlesForProduct, type Bundle } from "@/lib/bundles";
export type { Bundle };
export { BUNDLES };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format euro cents to a localised price string.
 * e.g. 2499 → "24,99€"
 *
 * Safety guarantees:
 *  - Coerces input to a finite number (NaN / undefined → 0)
 *  - Rounds to the nearest cent before dividing (avoids float drift)
 *  - Clamps to ≥ 0 (no negative prices displayed)
 */
export function formatPrice(cents: number): string {
  const safe = Math.max(0, Math.round(Number(cents) || 0));
  return (safe / 100).toFixed(2).replace(".", ",") + "\u20AC"; // U+20AC = €
}

/** Clave de localStorage donde se persiste el pack elegido, SEGREGADA POR
 *  PRODUCTO. Antes era una sola clave global: elegir "3 Botes" en la ficha de
 *  un producto dejaba esa selección activa al entrar en la de otro, y como
 *  además se buscaba en la lista global de packs, solo podía devolver packs
 *  del primer producto del catálogo. */
export function selectedBundleStorageKey(productSlug: string): string {
  return `selectedBundle:${productSlug}`;
}

/** Pack elegido para un producto concreto. Cae al pack marcado `popular`, y si
 *  no hay ninguno, al primero — nunca a un pack de otro producto. */
export function getStoredBundle(productSlug: string): Bundle | null {
  const bundles = getBundlesForProduct(productSlug);
  if (bundles.length === 0) return null;

  const porDefecto = bundles.find((b) => b.popular) ?? bundles[0];
  if (typeof window === "undefined") return porDefecto;

  try {
    const raw = localStorage.getItem(selectedBundleStorageKey(productSlug));
    if (raw) {
      const parsed = JSON.parse(raw) as { sku?: string };
      const found = bundles.find((b) => b.sku === parsed.sku);
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return porDefecto;
}
