// ─────────────────────────────────────────────────────────────────────────────
// useSessionTracker — Hook maestro que inicializa la sesión y coordina
// todos los trackers. Úsalo una sola vez en el layout raíz.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTrackingClient, destroyTrackingClient } from '@/lib/tracking-client'
import {
  generateFingerprint,
  getDeviceType,
  getDeviceInfo,
  getUtmParams,
  getStoredSessionId,
  storeSessionId,
  isSessionExpired,
  hasConsent,
  getCurrentUrl,
  getCurrentPath,
} from '@/lib/tracking-utils'
import type { TrackingSession, SessionStartInput } from '@/types/tracking.types'

interface SessionTrackerOptions {
  userId?: string | null
  debug?: boolean
}

export function useSessionTracker(options: SessionTrackerOptions = {}) {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return

    // No rastrear sin consentimiento explícito del usuario (GDPR/LOPD)
    if (!hasConsent()) {
      initializedRef.current = true
      setReady(true)
      return
    }

    initializedRef.current = true

    let cancelled = false

    async function init() {
      const client = getTrackingClient({ debug: options.debug ?? false })
      const existingId = getStoredSessionId()
      const needsNewSession = !existingId || isSessionExpired(30 * 60 * 1000)

      let sessionId = existingId ?? crypto.randomUUID()
      if (needsNewSession) {
        sessionId = crypto.randomUUID()
        storeSessionId(sessionId)
      }

      const fingerprint = await generateFingerprint()
      const deviceInfo = getDeviceInfo()
      const utms = getUtmParams()

      const session: TrackingSession = {
        id: sessionId,
        user_id: options.userId ?? null,
        fingerprint,
        device_type: getDeviceType(),
        device_info: deviceInfo,
        country: null, // Se rellena en el servidor por GeoIP
        region: null,
        city: null,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        landing_page: getCurrentPath(),
        ...utms,
        consent_given: true,
        created_at: new Date().toISOString(),
      }

      client.setSession(session)
      client.startHeartbeat()

      // Enviar evento de inicio de sesión
      const event: SessionStartInput = {
        eventType: 'session_start',
        url: getCurrentUrl(),
      }
      client.track(event)

      if (!cancelled) setReady(true)
    }

    init()

    return () => {
      cancelled = true
      destroyTrackingClient()
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
