// Shipping options — shared between client and server
// Import in API routes to verify pricing server-side

export type ShippingOption = {
  id: string
  name: string
  description: string
  estimatedDays: string
  basePrice: number  // euros; 0 if always free
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Envío Estándar',
    description: 'Correos / CTT Express',
    estimatedDays: '4-6 días laborables',
    basePrice: 3.99,
  },
  {
    id: 'express',
    name: 'Envío Exprés',
    description: 'GLS / DHL',
    estimatedDays: '1-2 días laborables',
    basePrice: 7.99,
  },
]

export const FREE_SHIPPING_THRESHOLD_EUR = 50

/** Returns the effective price for a shipping option given the cart subtotal */
export function getShippingPrice(optionId: string, subtotalEur: number): number {
  const option = SHIPPING_OPTIONS.find((o) => o.id === optionId)
  if (!option) return 0
  if (optionId === 'standard' && subtotalEur >= FREE_SHIPPING_THRESHOLD_EUR) return 0
  return option.basePrice
}
