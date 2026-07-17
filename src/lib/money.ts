// Utilidades de dinero — el importe interno SIEMPRE en céntimos (enteros).
// Sumar euros como float acumula error binario (29.99 + 19.99 = 49.980000000000004);
// en céntimos la aritmética es exacta y solo se convierte a euros al mostrar/persistir.

/** Euros (float) → céntimos (entero). Único punto donde se tolera el float de entrada. */
export const eurosToCents = (euros: number): number => Math.round(euros * 100)

/** Céntimos (entero) → euros con 2 decimales exactos. */
export const centsToEuros = (cents: number): number => cents / 100

/** Redondeo estable a 2 decimales para valores que deben persistirse en euros. */
export const round2 = (euros: number): number => centsToEuros(eurosToCents(euros))

/** Formato es-ES con símbolo pospuesto, igual al usado en el resto del sitio: "49,99€" */
export const formatEur = (euros: number): string =>
  euros.toFixed(2).replace(".", ",") + "€"
