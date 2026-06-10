// ─────────────────────────────────────────────────────────────────────────────
// ProductTracker — Wrapper que detecta cuando un producto entra en viewport
// y registra la vista con tiempo de permanencia.
//
// Uso:
//   <ProductTracker productId={1} productSlug="gominolas-vinagre-manzana">
//     <ProductCard ... />
//   </ProductTracker>
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef } from 'react'
import { useProductTracker } from '@/hooks/useProductTracker'

interface ProductTrackerProps {
  productId: number
  productSlug: string
  children: React.ReactNode
  trackOnMount?: boolean // Para SSR: si ya sabes que está visible
}

export function ProductTracker({
  productId,
  productSlug,
  children,
  trackOnMount = false,
}: ProductTrackerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { trackProductView } = useProductTracker()
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackOnMount) {
      trackProductView(productId, productSlug)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !trackedRef.current) {
            trackedRef.current = true
            trackProductView(productId, productSlug)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [productId, productSlug, trackOnMount, trackProductView])

  return <div ref={ref}>{children}</div>
}
