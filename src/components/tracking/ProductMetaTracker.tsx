// ─────────────────────────────────────────────────────────────────────────────
// ProductMetaTracker — Dispara ViewContent de Meta Pixel al montar la página de
// producto. trackViewContent() ya comprueba internamente que fbq esté disponible.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect } from 'react'
import { useMetaPixel } from '@/hooks/useMetaPixel'

interface Props {
  productId: number
  productSlug: string
  productName: string
  price: number
}

export default function ProductMetaTracker({ productId, productSlug, productName, price }: Props) {
  const { trackViewContent } = useMetaPixel()

  useEffect(() => {
    trackViewContent({
      id: productId,
      slug: productSlug,
      name: productName,
      price,
      currency: 'EUR',
    })
  }, [productId, productSlug, productName, price, trackViewContent])

  return null
}
