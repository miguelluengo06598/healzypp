// ─────────────────────────────────────────────────────────────────────────────
// ProductMetaTracker — Dispara eventos de Meta Pixel en la página de producto
// ViewContent después de 5 segundos (engagement real).
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
    const timer = setTimeout(() => {
      trackViewContent({
        id: productId,
        slug: productSlug,
        name: productName,
        price,
        currency: 'EUR',
      })
    }, 5000)

    return () => clearTimeout(timer)
  }, [productId, productSlug, productName, price, trackViewContent])

  return null
}
