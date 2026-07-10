// ─────────────────────────────────────────────────────────────────────────────
// useProductPageTracker — Hook que registra el comportamiento del usuario
// en la página de producto: secciones vistas, scroll, interacciones y salida.
//
// Requiere que las secciones estén envueltas en <ProductSectionWrapper>.
// Solo se activa si hay consentimiento de cookies (GDPR/LOPD).
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getTrackingClient } from '@/lib/tracking-client'
import { hasConsent, getCurrentUrl } from '@/lib/tracking-utils'
import type {
  ProductPageEnterInput,
  ProductSectionViewInput,
  ProductScrollDepthInput,
  ProductInteractionInput,
  ProductPageExitInput,
} from '@/types/tracking.types'

interface UseProductPageTrackerOptions {
  productId: number
  productSlug: string
}

export function useProductPageTracker({ productId, productSlug }: UseProductPageTrackerOptions) {
  const client = getTrackingClient()
  const enterTimeRef = useRef<number>(0)
  const lastSectionRef = useRef<string>('hero')
  const maxScrollRef = useRef<number>(0)
  const reportedSectionsRef = useRef<Set<string>>(new Set())
  const reportedDepthsRef = useRef<Set<number>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  const url = getCurrentUrl()

  const sendEvent = useCallback(
    (event: ProductPageEnterInput | ProductSectionViewInput | ProductScrollDepthInput | ProductInteractionInput | ProductPageExitInput) => {
      if (!hasConsent()) return
      client.track(event)
    },
    [client]
  )

  useEffect(() => {
    if (!hasConsent()) return

    enterTimeRef.current = Date.now()

    // 1. page_enter
    sendEvent({
      eventType: 'product_page_enter',
      url,
      productId,
      productSlug,
    })

    // 2. IntersectionObserver para secciones
    const sectionElements = document.querySelectorAll('[data-section]')
    if (sectionElements.length > 0) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const section = entry.target.getAttribute('data-section') ?? 'unknown'
              lastSectionRef.current = section

              if (!reportedSectionsRef.current.has(section)) {
                reportedSectionsRef.current.add(section)
                sendEvent({
                  eventType: 'product_section_view',
                  url: getCurrentUrl(),
                  productId,
                  productSlug,
                  section,
                })
              }
            }
          }
        },
        { threshold: 0.5 }
      )

      sectionElements.forEach((el) => observerRef.current?.observe(el))
    }

    // 3. Scroll depth
    const depthMarks = [25, 50, 75, 90, 100]
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const percent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0

      if (percent > maxScrollRef.current) {
        maxScrollRef.current = percent
      }

      for (const mark of depthMarks) {
        if (percent >= mark && !reportedDepthsRef.current.has(mark)) {
          reportedDepthsRef.current.add(mark)
          sendEvent({
            eventType: 'product_scroll_depth',
            url: getCurrentUrl(),
            productId,
            productSlug,
            depthPercent: mark,
          })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // 4. Interacciones (event delegation)
    const handleInteraction = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Buscar data-track-action en el elemento o ancestros
      const actionable = target.closest('[data-track-action]') as HTMLElement | null
      if (!actionable) return

      const action = actionable.getAttribute('data-track-action') as ProductInteractionInput['action'] | null
      if (!action) return

      const extra: Record<string, unknown> = {}
      actionable.querySelectorAll('[data-track-value]').forEach((el) => {
        const key = el.getAttribute('data-track-key') ?? 'value'
        extra[key] = (el as HTMLElement).innerText || (el as HTMLElement).getAttribute('data-track-value')
      })

      sendEvent({
        eventType: 'product_interaction',
        url: getCurrentUrl(),
        productId,
        productSlug,
        action,
        extra: Object.keys(extra).length > 0 ? extra : undefined,
      })
    }

    document.addEventListener('click', handleInteraction)

    // 5. page_exit
    const sendExit = () => {
      if (enterTimeRef.current === 0) return
      const totalSeconds = Math.round((Date.now() - enterTimeRef.current) / 1000)

      sendEvent({
        eventType: 'product_page_exit',
        url: getCurrentUrl(),
        productId,
        productSlug,
        totalSeconds,
        lastSection: lastSectionRef.current,
        maxScrollPercent: maxScrollRef.current,
      })

      // Flush inmediato para no perder el evento de salida
      client.flush()
    }

    const handleBeforeUnload = () => sendExit()
    const handleVisibility = () => {
      if (document.hidden) sendExit()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      observerRef.current?.disconnect()
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleInteraction)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [productId, productSlug, url, sendEvent, client])
}
