// ─────────────────────────────────────────────────────────────────────────────
// Cliente HTTP de Tracking
// Batching, retry automático, persistencia offline, performance optimizada
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TrackerConfig,
  TrackingEvent,
  TrackingEventInput,
  TrackingSession,
  TrackBatchPayload,
  TrackApiResponse,
} from '@/types/tracking.types'
import {
  enqueueEvent,
  removeQueuedEvent,
  updateQueuedEventRetries,
  getQueuedEvents,
  clearQueue,
  generateEventId,
} from './tracking-utils'

// ─── Configuración por defecto ───────────────────────────────────────────────

const DEFAULT_CONFIG: TrackerConfig = {
  endpoint: '/api/track',
  batchSize: 10,
  batchIntervalMs: 3000,
  maxRetries: 3,
  retryDelayMs: 2000,
  heartbeatIntervalMs: 30000,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutos
  debug: false,
}

// ─── Singleton global ────────────────────────────────────────────────────────

let instance: TrackingClient | null = null

export function getTrackingClient(config?: Partial<TrackerConfig>): TrackingClient {
  if (!instance) {
    instance = new TrackingClient(config)
  }
  return instance
}

export function destroyTrackingClient() {
  instance?.destroy()
  instance = null
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

class TrackingClient {
  private config: TrackerConfig
  private session: TrackingSession | null = null
  private queue: TrackingEvent[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false
  private beaconSent = false

  constructor(config?: Partial<TrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.bindVisibilityChange()
    this.bindBeforeUnload()
  }

  // ─── Config ────────────────────────────────────────────────────────────────

  setSession(session: TrackingSession) {
    this.session = session
  }

  getSessionId(): string | null {
    return this.session?.id ?? null
  }

  // ─── Envío de eventos ──────────────────────────────────────────────────────

  track(event: TrackingEventInput): void {
    if (this.destroyed) return
    if (!this.session) {
      if (this.config.debug) console.warn('[Tracker] No hay sesión activa')
      return
    }

    const fullEvent: TrackingEvent = {
      ...event,
      sessionId: this.session.id,
      timestamp: Date.now(),
    } as TrackingEvent

    this.queue.push(fullEvent)

    if (this.queue.length >= this.config.batchSize) {
      this.flush()
    } else {
      this.scheduleFlush()
    }
  }

  // ─── Flush ─────────────────────────────────────────────────────────────────

  flush = async (): Promise<void> => {
    if (this.destroyed) return
    if (this.queue.length === 0) return
    if (!this.session) return

    // Cancelar timer pendiente
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    const batch = this.queue.splice(0, this.config.batchSize)
    const payload: TrackBatchPayload = {
      session: this.session,
      events: batch,
    }

    try {
      await this.sendWithRetry(payload)
      if (this.config.debug) console.log('[Tracker] Batch enviado:', batch.length)
      // Reintentar cola offline
      await this.retryOfflineQueue()
    } catch (err) {
      if (this.config.debug) console.error('[Tracker] Error enviando batch:', err)
      // Encolar para retry offline
      enqueueEvent(payload)
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flush()
    }, this.config.batchIntervalMs)
  }

  // ─── Retry + offline queue ─────────────────────────────────────────────────

  private async sendWithRetry(payload: TrackBatchPayload, attempt = 0): Promise<void> {
    try {
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: attempt === this.config.maxRetries, // keepalive en último intento
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: TrackApiResponse = await res.json()
      if (!data.success) throw new Error(data.errors?.join(', ') ?? 'API error')
    } catch (err) {
      if (attempt < this.config.maxRetries) {
        await delay(this.config.retryDelayMs * Math.pow(2, attempt))
        return this.sendWithRetry(payload, attempt + 1)
      }
      throw err
    }
  }

  private async retryOfflineQueue() {
    const offline = getQueuedEvents()
    for (const item of offline) {
      if (item.retries >= this.config.maxRetries) {
        removeQueuedEvent(item.id)
        continue
      }
      try {
        const payload = JSON.parse(item.payload) as TrackBatchPayload
        await this.sendWithRetry(payload, item.retries)
        removeQueuedEvent(item.id)
      } catch {
        updateQueuedEventRetries(item.id, item.retries + 1)
      }
    }
  }

  // ─── Heartbeat (mantiene sesión viva) ──────────────────────────────────────

  startHeartbeat() {
    if (this.heartbeatTimer) return
    const send = () => {
      this.track({
        eventType: 'heartbeat',
        url: typeof window !== 'undefined' ? window.location.href : '',
      } as TrackingEvent)
    }
    this.heartbeatTimer = setInterval(send, this.config.heartbeatIntervalMs)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ─── Abandono / navegación ─────────────────────────────────────────────────

  sendAbandonment(reason: string, extra: Record<string, unknown> = {}) {
    if (this.destroyed || !this.session) return
    const payload: TrackBatchPayload = {
      session: this.session,
      events: [
        {
          eventType: 'abandonment',
          sessionId: this.session.id,
          timestamp: Date.now(),
          url: typeof window !== 'undefined' ? window.location.href : '',
          reason,
          lastPage: typeof window !== 'undefined' ? window.location.pathname : '',
          ...extra,
        } as TrackingEvent,
      ],
    }
    // Usar sendBeacon si está disponible (no bloquea unload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon(this.config.endpoint, blob)
      this.beaconSent = true
    } else {
      // Fallback: fetch con keepalive
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => enqueueEvent(payload))
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  private bindVisibilityChange() {
    if (typeof document === 'undefined') return
    document.addEventListener('visibilitychange', this.handleVisibility)
  }

  private handleVisibility = () => {
    if (document.hidden) {
      this.flush()
    }
  }

  private bindBeforeUnload() {
    if (typeof window === 'undefined') return
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }

  private handleBeforeUnload = () => {
    this.sendAbandonment('close_tab')
    this.flush()
  }

  destroy() {
    this.destroyed = true
    this.stopHeartbeat()
    if (this.flushTimer) clearTimeout(this.flushTimer)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}
