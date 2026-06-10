// ─────────────────────────────────────────────────────────────────────────────
// TrackingProvider — Componente de alto nivel que inicializa el tracking
// en toda la aplicación. Envuélvelo en el layout raíz.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useSessionTracker } from '@/hooks/useSessionTracker'
import { usePageTracker } from '@/hooks/usePageTracker'

interface TrackingProviderProps {
  children: React.ReactNode
  userId?: string | null
  debug?: boolean
}

export function TrackingProvider({ children, userId, debug }: TrackingProviderProps) {
  // Inicializa sesión + heartbeat
  useSessionTracker({ userId, debug })

  // Rastrea navegación entre páginas
  usePageTracker()

  return <>{children}</>
}
