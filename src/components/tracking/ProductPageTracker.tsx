// ─────────────────────────────────────────────────────────────────────────────
// ProductPageTracker — Componente cliente invisible que monta
// useProductPageTracker en la página de producto.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useProductPageTracker } from '@/hooks/useProductPageTracker'

interface Props {
  productId: number
  productSlug: string
}

export default function ProductPageTracker({ productId, productSlug }: Props) {
  useProductPageTracker({ productId, productSlug })
  return null
}
