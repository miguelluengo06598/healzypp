// Importamos desde el módulo compartido (los re-exports de tipo no están disponibles
// en el scope del fichero — hay que importar explícitamente para usarlos aquí abajo).
import { BUNDLES, type Bundle } from "@/lib/bundles";
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

export function getStoredBundle(): Bundle {
  if (typeof window === "undefined") return BUNDLES[1];
  try {
    const raw = localStorage.getItem("selectedBundle");
    if (raw) {
      const parsed = JSON.parse(raw) as { id: number };
      const found = BUNDLES.find((b) => b.id === parsed.id);
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return BUNDLES[1]; // default: 2 Botes
}
