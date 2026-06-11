// Datos de bundles compartidos entre servidor y cliente.
// Sin "use client" ni "use server" para que sea importable desde ambos contextos.

export const CARD_DISCOUNT_CENTS = 500; // €5.00

export type Bundle = {
  id: number;
  name: string;
  price: string;
  priceInCents: number;
  popular: boolean;
};

export const BUNDLES: Bundle[] = [
  { id: 1, name: "1 Bote",  price: "29,99€", priceInCents: 2999, popular: false },
  { id: 2, name: "2 Botes", price: "49,99€", priceInCents: 4999, popular: true  },
  { id: 3, name: "3 Botes", price: "59,99€", priceInCents: 5999, popular: false },

];

export const BASE_UNIT_PRICE_EUR = 29.99;

/** Cantidad de unidades por bundle (el id coincide con la cantidad) */
export function getBundleQuantity(bundle: Bundle): number {
  return bundle.id;
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
