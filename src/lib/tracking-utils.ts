// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de Tracking
// Detección de dispositivo, fingerprint ligero, UTM params, consentimiento
// ─────────────────────────────────────────────────────────────────────────────

import { type DeviceType, type DeviceInfo } from '@/types/tracking.types'

const SESSION_KEY = 'tracking_session_id'
const SESSION_TS_KEY = 'tracking_session_ts'
const QUEUE_KEY = 'tracking_queue'
const CONSENT_KEY = 'healzyp_cookie_consent'

// ─── Detección de dispositivo ────────────────────────────────────────────────

export function getDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  const width = window.innerWidth

  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua) || (width >= 600 && width <= 1024)) return 'tablet'
    return 'mobile'
  }
  return 'desktop'
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined') return {}
  const ua = navigator.userAgent
  const platform = navigator.platform

  let os = 'unknown'
  let browser = 'unknown'

  if (ua.includes('Win')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edg')) browser = 'Edge'

  return {
    os,
    browser,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
  }
}

// ─── Fingerprint anónimo (no usa IP, solo navegador) ─────────────────────────

export async function generateFingerprint(): Promise<string> {
  if (typeof navigator === 'undefined') return 'ssr'

  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    new Date().getTimezoneOffset().toString(),
    !!navigator.webdriver ? '1' : '0',
  ]

  const str = components.join('||')
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

// ─── UTM params ──────────────────────────────────────────────────────────────

export function getUtmParams() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
  }
}

// ─── Session storage (localStorage) ──────────────────────────────────────────

export function getStoredSessionId(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(SESSION_KEY)
}

export function storeSessionId(id: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SESSION_KEY, id)
  localStorage.setItem(SESSION_TS_KEY, Date.now().toString())
}

export function clearStoredSession() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_TS_KEY)
}

export function isSessionExpired(timeoutMs: number): boolean {
  if (typeof localStorage === 'undefined') return true
  const ts = localStorage.getItem(SESSION_TS_KEY)
  if (!ts) return true
  return Date.now() - Number(ts) > timeoutMs
}

// ─── Cola offline ────────────────────────────────────────────────────────────

export interface QueuedEvent {
  id: string
  payload: string
  retries: number
  createdAt: number
}

export function getQueuedEvents(): QueuedEvent[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function enqueueEvent(payload: object): QueuedEvent {
  const queue = getQueuedEvents()
  const item: QueuedEvent = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    payload: JSON.stringify(payload),
    retries: 0,
    createdAt: Date.now(),
  }
  queue.push(item)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return item
}

export function removeQueuedEvent(id: string) {
  const queue = getQueuedEvents().filter((e) => e.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function updateQueuedEventRetries(id: string, retries: number) {
  const queue = getQueuedEvents().map((e) => (e.id === id ? { ...e, retries } : e))
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(QUEUE_KEY)
}

// ─── Consentimiento GDPR / LOPD ──────────────────────────────────────────────

export function hasConsent(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(CONSENT_KEY) === 'true'
}

export function setConsent(granted: boolean) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CONSENT_KEY, granted ? 'true' : 'false')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function getCurrentUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.href
}

export function getCurrentPath(): string {
  if (typeof window === 'undefined') return ''
  return window.location.pathname + window.location.search
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
