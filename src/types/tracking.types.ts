// ─────────────────────────────────────────────────────────────────────────────
// Tipos TypeScript para el Sistema de Tracking y Analytics
// ─────────────────────────────────────────────────────────────────────────────

export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown'
export type CartAction = 'add' | 'remove' | 'update'
export type CheckoutStep = 'init' | 'shipping' | 'payment' | 'review'
export type AbandonmentReason = 'close_tab' | 'navigate_away' | 'timeout' | 'checkout_exit' | 'unknown'
export type TrackingEventType =
  | 'session_start'
  | 'page_view'
  | 'product_view'
  | 'cart_action'
  | 'checkout_start'
  | 'checkout_complete'
  | 'conversion'
  | 'abandonment'
  | 'heartbeat'
  | 'product_page_enter'
  | 'product_section_view'
  | 'product_scroll_depth'
  | 'product_interaction'
  | 'product_page_exit'

// ─── Sesión ──────────────────────────────────────────────────────────────────

export interface TrackingSession {
  id: string
  user_id?: string | null
  fingerprint: string
  device_type: DeviceType
  device_info: DeviceInfo
  country?: string | null
  region?: string | null
  city?: string | null
  referrer?: string | null
  landing_page: string
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  consent_given: boolean
  created_at: string
}

export interface DeviceInfo {
  os?: string
  browser?: string
  screen?: string
  language?: string
}

// ─── Eventos de tracking ─────────────────────────────────────────────────────

export interface BaseTrackingEvent {
  eventType: TrackingEventType
  sessionId: string
  timestamp: number
  url: string
}

export interface PageViewEvent extends BaseTrackingEvent {
  eventType: 'page_view'
  path: string
  title: string
  durationSeconds?: number
}

export interface ProductViewEvent extends BaseTrackingEvent {
  eventType: 'product_view'
  productId: number
  productSlug: string
  durationSeconds?: number
}

export interface CartActionEvent extends BaseTrackingEvent {
  eventType: 'cart_action'
  productId: number
  bundleId?: number | null
  action: CartAction
  quantity: number
  unitPrice?: number | null
  cartTotal?: number | null
}

export interface CheckoutEvent extends BaseTrackingEvent {
  eventType: 'checkout_start' | 'checkout_complete'
  step?: CheckoutStep
  cartTotal?: number
  itemsCount?: number
}

export interface ConversionEvent extends BaseTrackingEvent {
  eventType: 'conversion'
  orderId?: string
  orderNumber?: string
  totalAmount: number
  itemsCount: number
  paymentMethod?: string
}

export interface AbandonmentEvent extends BaseTrackingEvent {
  eventType: 'abandonment'
  reason: AbandonmentReason
  lastPage: string
  cartValue?: number
  itemsInCart?: number
}

export interface HeartbeatEvent extends BaseTrackingEvent {
  eventType: 'heartbeat'
}

// ─── Eventos de comportamiento en página de producto ─────────────────────────

export interface ProductPageEnterEvent extends BaseTrackingEvent {
  eventType: 'product_page_enter'
  productId: number
  productSlug: string
}

export interface ProductSectionViewEvent extends BaseTrackingEvent {
  eventType: 'product_section_view'
  productId: number
  productSlug: string
  section: string
}

export interface ProductScrollDepthEvent extends BaseTrackingEvent {
  eventType: 'product_scroll_depth'
  productId: number
  productSlug: string
  depthPercent: number
}

export interface ProductInteractionEvent extends BaseTrackingEvent {
  eventType: 'product_interaction'
  productId: number
  productSlug: string
  action: 'add_to_cart' | 'buy_now' | 'bundle_select' | 'scroll'
  extra?: Record<string, unknown>
}

export interface ProductPageExitEvent extends BaseTrackingEvent {
  eventType: 'product_page_exit'
  productId: number
  productSlug: string
  totalSeconds: number
  lastSection: string
  maxScrollPercent: number
}

export type TrackingEvent =
  | PageViewEvent
  | ProductViewEvent
  | CartActionEvent
  | CheckoutEvent
  | ConversionEvent
  | AbandonmentEvent
  | HeartbeatEvent
  | ProductPageEnterEvent
  | ProductSectionViewEvent
  | ProductScrollDepthEvent
  | ProductInteractionEvent
  | ProductPageExitEvent

// ─── Input types para envío (sin sessionId/timestamp) ───────────────────────

export type PageViewInput = Omit<PageViewEvent, 'sessionId' | 'timestamp'>
export type ProductViewInput = Omit<ProductViewEvent, 'sessionId' | 'timestamp'>
export type CartActionInput = Omit<CartActionEvent, 'sessionId' | 'timestamp'>
export type CheckoutInput = Omit<CheckoutEvent, 'sessionId' | 'timestamp'>
export type ConversionInput = Omit<ConversionEvent, 'sessionId' | 'timestamp'>
export type AbandonmentInput = Omit<AbandonmentEvent, 'sessionId' | 'timestamp'>
export type HeartbeatInput = Omit<HeartbeatEvent, 'sessionId' | 'timestamp'>
export type SessionStartInput = { eventType: 'session_start'; url: string }

export type ProductPageEnterInput = Omit<ProductPageEnterEvent, 'sessionId' | 'timestamp'>
export type ProductSectionViewInput = Omit<ProductSectionViewEvent, 'sessionId' | 'timestamp'>
export type ProductScrollDepthInput = Omit<ProductScrollDepthEvent, 'sessionId' | 'timestamp'>
export type ProductInteractionInput = Omit<ProductInteractionEvent, 'sessionId' | 'timestamp'>
export type ProductPageExitInput = Omit<ProductPageExitEvent, 'sessionId' | 'timestamp'>

export type TrackingEventInput =
  | PageViewInput
  | ProductViewInput
  | CartActionInput
  | CheckoutInput
  | ConversionInput
  | AbandonmentInput
  | HeartbeatInput
  | SessionStartInput
  | ProductPageEnterInput
  | ProductSectionViewInput
  | ProductScrollDepthInput
  | ProductInteractionInput
  | ProductPageExitInput

// ─── Payload del batch ───────────────────────────────────────────────────────

export interface TrackBatchPayload {
  session: TrackingSession
  events: TrackingEvent[]
}

// ─── Respuesta de la API ─────────────────────────────────────────────────────

export interface TrackApiResponse {
  success: boolean
  sessionId?: string
  processed: number
  errors?: string[]
}

export interface LiveAnalyticsResponse {
  activeSessions: number
  authenticatedUsers: number
  mobileSessions: number
  desktopSessions: number
  topPages: { path: string; viewCount: number; lastView: string }[]
  topProducts: { productId: number; productSlug: string; viewCount: number; avgDuration: number }[]
  funnel: {
    sessions: number
    productViews: number
    addToCarts: number
    checkouts: number
    conversions: number
  }
}

// ─── Opciones de configuración ───────────────────────────────────────────────

export interface TrackerConfig {
  endpoint: string
  batchSize: number
  batchIntervalMs: number
  maxRetries: number
  retryDelayMs: number
  heartbeatIntervalMs: number
  sessionTimeoutMs: number
  debug: boolean
}

// ─── Database rows (para Supabase) ───────────────────────────────────────────

export interface TrackingSessionRow {
  id: string
  user_id: string | null
  fingerprint: string | null
  device_type: DeviceType
  device_info: DeviceInfo
  country: string | null
  region: string | null
  city: string | null
  referrer: string | null
  landing_page: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  consent_given: boolean
  ended_at: string | null
  duration_seconds: number
  created_at: string
}

export interface TrackingPageViewRow {
  id: string
  session_id: string
  url: string
  path: string
  title: string | null
  duration_seconds: number
  created_at: string
}

export interface TrackingProductViewRow {
  id: string
  session_id: string
  product_id: number
  product_slug: string
  duration_seconds: number
  created_at: string
}

export interface TrackingCartActionRow {
  id: string
  session_id: string
  product_id: number
  bundle_id: number | null
  action: CartAction
  quantity: number
  unit_price: number | null
  cart_total: number | null
  created_at: string
}

export interface TrackingConversionRow {
  id: string
  session_id: string
  order_id: string | null
  order_number: string | null
  total_amount: number
  items_count: number
  payment_method: string | null
  created_at: string
}
