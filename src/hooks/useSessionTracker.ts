// ─────────────────────────────────────────────────────────────────────────────
// useSessionTracker — Hook maestro que inicializa la sesión y coordina
// todos los trackers. Úsalo una sola vez en el layout raíz.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTrackingClient } from '@/lib/tracking-client'
import {
  generateFingerprint,
  getDeviceType,
  getDeviceInfo,
  getUtmParams,
  getStoredSessionId,
  storeSessionId,
  isSessionExpired,
  hasConsent,
  getCurrentPath,
} from '@/lib/tracking-utils'
import type { TrackingSession } from '@/types/tracking.types'

interface SessionTrackerOptions {
  userId?: string | null
  debug?: boolean
}

export function useSessionTracker(options: SessionTrackerOptions = {}) {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // No rastrear sin consentimiento explícito del usuario (GDPR/LOPD)
    if (!hasConsent()) {
      setReady(true)
      return
    }

    let cancelled = false
    const client = getTrackingClient({ debug: options.debug ?? false })

    // ensureSession() es idempotente y se apoya en el estado real del
    // cliente (this.session / this.initPromise dentro de TrackingClient),
    // no en un ref de este componente — así, si React Strict Mode monta
    // este efecto dos veces (desarrollo), el segundo montaje se engancha a
    // la misma inicialización en curso en vez de arrancar una nueva sesión
    // o quedarse bloqueado creyendo que "ya se inicializó" cuando en
    // realidad la primera se abortó a medias. destroyTrackingClient() ya NO
    // se llama en el cleanup: este provider vive en el layout raíz, así que
    // en un navegador real el cleanup solo se dispara por el remount
    // sintético de Strict Mode, nunca por un cierre real de la página
    // (eso destruye todo el contexto JS igualmente).
    client
      .ensureSession(async () => {
        const existingId = getStoredSessionId()
        const needsNewSession = !existingId || isSessionExpired(30 * 60 * 1000)
        const sessionId = needsNewSession ? crypto.randomUUID() : (existingId as string)
        if (needsNewSession) storeSessionId(sessionId)

        const fingerprint = await generateFingerprint()

        const session: TrackingSession = {
          id: sessionId,
          user_id: options.userId ?? null,
          fingerprint,
          device_type: getDeviceType(),
          device_info: getDeviceInfo(),
          country: null, // Se rellena en el servidor por GeoIP
          region: null,
          city: null,
          referrer: typeof document !== 'undefined' ? document.referrer : null,
          landing_page: getCurrentPath(),
          ...getUtmParams(),
          consent_given: true,
          created_at: new Date().toISOString(),
        }

        return session
      })
      .then(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [options.userId, options.debug])

  // Resetear sesión si cambia el usuario (login/logout)
  useEffect(() => {
    if (!ready) return
    const client = getTrackingClient()
    const session = client.getSessionId()
    if (!session) return
    // El user_id se actualiza en el payload de cada batch, no hace falta recrear
  }, [options.userId, ready])

  return { ready }
}
