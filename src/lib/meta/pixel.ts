// ─────────────────────────────────────────────────────────────────────────────
// Utilidades cliente para Meta Pixel
// Puras — sin dependencias de React ni del DOM.
// ─────────────────────────────────────────────────────────────────────────────

/** Genera un event_id único para una llamada fbq → deduplicación con CAPI. */
export function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/** Event_id determinístico para Purchase.
 *  Usar el mismo valor en el navegador y en el servidor garantiza deduplicación. */
export function getPurchaseEventId(orderNumber: string): string {
  return `purchase_${orderNumber}`
}
