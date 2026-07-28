// ─────────────────────────────────────────────────────────────────────────────
// ProductMetaTracker — Dispara ViewContent de Meta Pixel al montar la página de
// producto. trackViewContent() ya comprueba internamente que fbq esté disponible.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect } from 'react'
import { useMetaPixel } from '@/hooks/useMetaPixel'

interface Props {
  /** content_id de Meta: el id numérico del PACK preseleccionado, no el del
   *  producto. Los otros tres eventos (AddToCart, InitiateCheckout, Purchase)
   *  hablan de packs; si ViewContent hablara de productos, Meta no podría
   *  correlacionar la visita con la compra. */
  bundleId: number
  productSlug: string
  /** Nombre cualificado del pack ("Producto — 2 Botes"). */
  bundleName: string
  /** Precio del pack preseleccionado, no el "desde X€" del producto. */
  price: number
}

export default function ProductMetaTracker({ bundleId, productSlug, bundleName, price }: Props) {
  const { trackViewContent } = useMetaPixel()

  useEffect(() => {
    trackViewContent({
      id: bundleId,
      slug: productSlug,
      name: bundleName,
      price,
      currency: 'EUR',
    })
  }, [bundleId, productSlug, bundleName, price, trackViewContent])

  return null
}
