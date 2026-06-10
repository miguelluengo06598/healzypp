// ─────────────────────────────────────────────────────────────────────────────
// usePageTracker — Rastrea navegación entre páginas y tiempo en cada una
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getTrackingClient } from '@/lib/tracking-client'
import { getCurrentUrl, getCurrentPath, hasConsent } from '@/lib/tracking-utils'
import type { PageViewInput } from '@/types/tracking.types'

export function usePageTracker() {
  const pathname = usePathname()
  const startTimeRef = useRef<number>(Date.now())
  const client = getTrackingClient()

  useEffect(() => {
    // No rastrear sin consentimiento del usuario (GDPR/LOPD)
    if (!hasConsent()) return

    // En cada cambio de ruta: registrar la nueva página
    const title = document.title
    const url = getCurrentUrl()
    const path = getCurrentPath()

    const event: PageViewInput = {
      eventType: 'page_view',
      url,
      path,
      title,
      durationSeconds: 0,
    }
    client.track(event)

    startTimeRef.current = Date.now()

    return () => {
      // Al salir: actualizar duración (evento silencioso sin reenvío de page_view)
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (duration > 0) {
        const exitEvent: PageViewInput = {
          eventType: 'page_view',
          url,
          path,
          title,
          durationSeconds: duration,
        }
        client.track(exitEvent)
      }
    }
  }, [pathname, client])
}
