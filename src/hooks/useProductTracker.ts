// ─────────────────────────────────────────────────────────────────────────────
// useProductTracker — Rastrea visualización de productos con tiempo en pantalla
// Uso: const { trackProductView } = useProductTracker()
//       trackProductView(productId, productSlug)
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getTrackingClient } from '@/lib/tracking-client'
import { getCurrentUrl } from '@/lib/tracking-utils'
import type { ProductViewInput } from '@/types/tracking.types'

export function useProductTracker() {
  const client = getTrackingClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)
  const sentRef = useRef<boolean>(false)
  const currentProductRef = useRef<{ id: number; slug: string } | null>(null)

  const trackProductView = useCallback(
    (productId: number, productSlug: string) => {
      // Limpiar producto anterior si cambió
      if (
        currentProductRef.current &&
        currentProductRef.current.id !== productId
      ) {
        if (timerRef.current) clearTimeout(timerRef.current)
        sentRef.current = false
      }

      currentProductRef.current = { id: productId, slug: productSlug }
      startTimeRef.current = Date.now()

      // IntersectionObserver ya debería haber confirmado visibilidad,
      // pero añadimos un mínimo de 2 segundos para contar como "visto"
      timerRef.current = setTimeout(() => {
        if (sentRef.current) return
        sentRef.current = true

        const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
        const event: ProductViewInput = {
          eventType: 'product_view',
          url: getCurrentUrl(),
          productId,
          productSlug,
          durationSeconds: duration,
        }
        client.track(event)
      }, 2000)
    },
    [client]
  )

  const trackProductImpression = useCallback(
    (productId: number, productSlug: string) => {
      // Vista inmediata (para listados sin tiempo de permanencia)
      const event: ProductViewInput = {
        eventType: 'product_view',
        url: getCurrentUrl(),
        productId,
        productSlug,
        durationSeconds: 0,
      }
      client.track(event)
    },
    [client]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { trackProductView, trackProductImpression }
}
