// ─────────────────────────────────────────────────────────────────────────────
// Tipos TypeScript para la base de datos Supabase
// Generados manualmente — para regenerarlos automáticamente ejecuta:
//   npx supabase gen types typescript --project-id <TU_PROJECT_ID> > src/types/database.types.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums ───────────────────────────────────────────────────────────────────

export type PaymentMethod = 'COD' | 'CARD'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export type CartAction = 'add' | 'remove' | 'update'
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown'

// ─── Row types (lo que devuelve Supabase en un SELECT) ───────────────────────

export interface ProductRow {
  id: number
  title: string
  description: string | null
  price: number
  discount: number
  rating: number
  stock: number
  active: boolean
  image_url: string
  gallery_urls: string[] | null
  slug: string
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface BundleRow {
  id: number
  product_id: number | null
  name: string
  quantity: number
  price: number
  discount: number
  popular: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerRow {
  id: number
  full_name: string
  phone: string
  email: string | null
  address: string
  postal_code: string
  city: string
  province: string
  country: string
  total_orders: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface OrderRow {
  id: string                          // UUID
  order_number: string
  customer_id: number | null
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  shipping_postal: string
  shipping_city: string
  shipping_province: string
  shipping_country: string
  subtotal: number
  shipping_cost: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  paid_at: string | null
  stripe_payment_intent_id: string | null
  stripe_client_secret: string | null
  status: OrderStatus
  customer_notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  cancelled_at: string | null
}

export interface OrderItemRow {
  id: number
  order_id: string                    // UUID
  product_id: number | null
  product_title: string
  bundle_id: number | null
  bundle_name: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
}

export interface ReviewRow {
  id: number
  product_id: number | null
  order_id: string | null             // UUID
  customer_name: string
  rating: number
  comment: string | null
  verified: boolean
  visible: boolean
  created_at: string
  updated_at: string
}

// ─── Tracking rows ───────────────────────────────────────────────────────────

export interface TrackingSessionRow {
  id: string                          // UUID
  user_id: string | null
  fingerprint: string | null
  device_type: DeviceType
  device_info: Record<string, unknown>
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

export interface TrackingCheckoutRow {
  id: string
  session_id: string
  step: string
  cart_total: number | null
  items_count: number | null
  completed: boolean
  created_at: string
  completed_at: string | null
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

export interface TrackingAbandonmentRow {
  id: string
  session_id: string
  reason: string
  last_page: string
  cart_value: number
  items_in_cart: number
  created_at: string
}

export interface TrackingEventRow {
  id: string
  session_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

// ─── Insert types (lo que envías en un INSERT) ───────────────────────────────

export type CustomerInsert = Omit<CustomerRow, 'id' | 'total_orders' | 'total_spent' | 'created_at' | 'updated_at'>

export type OrderInsert = Omit<OrderRow, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'cancelled_at'>

export type OrderItemInsert = Omit<OrderItemRow, 'id' | 'created_at'>

export type ReviewInsert = Omit<ReviewRow, 'id' | 'created_at' | 'updated_at'>

export interface ContactMessageRow {
  id: number
  name: string
  email: string
  message: string
  created_at: string
}

export type ContactMessageInsert = Omit<ContactMessageRow, 'id' | 'created_at'>

// ─── Tipo genérico de la base de datos (compatible con createClient<Database>) ──

// Supabase v2 requiere el campo `Relationships` en cada tabla
type NoRelationships = { Relationships: [] }

export interface Database {
  public: {
    Tables: {
      products: {
        Row: ProductRow
        Insert: Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>>
      } & NoRelationships
      bundles: {
        Row: BundleRow
        Insert: Omit<BundleRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BundleRow, 'id' | 'created_at' | 'updated_at'>>
      } & NoRelationships
      customers: {
        Row: CustomerRow
        Insert: CustomerInsert
        Update: Partial<CustomerInsert>
      } & NoRelationships
      orders: {
        Row: OrderRow
        Insert: OrderInsert
        Update: Partial<OrderInsert>
      } & NoRelationships
      order_items: {
        Row: OrderItemRow
        Insert: OrderItemInsert
        Update: Partial<OrderItemInsert>
      } & NoRelationships
      reviews: {
        Row: ReviewRow
        Insert: ReviewInsert
        Update: Partial<ReviewInsert>
      } & NoRelationships
      contact_messages: {
        Row: ContactMessageRow
        Insert: ContactMessageInsert
        Update: Partial<ContactMessageInsert>
      } & NoRelationships
      // Tracking tables
      tracking_sessions: {
        Row: TrackingSessionRow
        Insert: Omit<TrackingSessionRow, 'created_at'>
        Update: Partial<Omit<TrackingSessionRow, 'id' | 'created_at'>>
      } & NoRelationships
      tracking_page_views: {
        Row: TrackingPageViewRow
        Insert: Omit<TrackingPageViewRow, 'id' | 'created_at'>
        Update: Partial<Omit<TrackingPageViewRow, 'id' | 'created_at'>>
      } & NoRelationships
      tracking_product_views: {
        Row: TrackingProductViewRow
        Insert: Omit<TrackingProductViewRow, 'id' | 'created_at'>
        Update: Partial<Omit<TrackingProductViewRow, 'id' | 'created_at'>>
      } & NoRelationships
      tracking_cart_actions: {
        Row: TrackingCartActionRow
        Insert: Omit<TrackingCartActionRow, 'id' | 'created_at'>
        Update: Partial<Omit<TrackingCartActionRow, 'id' | 'created_at'>>
      } & NoRelationships
      tracking_checkouts: {
        Row: TrackingCheckoutRow
        Insert: Omit<TrackingCheckoutRow, 'id' | 'created_at' | 'completed_at'>
        Update: Partial<Omit<TrackingCheckoutRow, 'id' | 'created_at'>>
      } & NoRelationships
      tracking_conversions: {
        Row: TrackingConversionRow
        Insert: Omit<TrackingConversionRow, 'id' | 'created_at'>
        Update: Partial<Omit<TrackingConversionRow, 'id' | 'created_at'>>
      } & NoRelationships
      tracking_abandonments: {
        Row: TrackingAbandonmentRow
        Insert: Omit<TrackingAbandonmentRow, 'id' | 'created_at'>
        Update: Partial<Omit<TrackingAbandonmentRow, 'id' | 'created_at'>>
      } & NoRelationships
      tracking_events: {
        Row: TrackingEventRow
        Insert: Omit<TrackingEventRow, 'id' | 'created_at'>
        Update: Partial<Omit<TrackingEventRow, 'id' | 'created_at'>>
      } & NoRelationships
    }
    Views: Record<string, never>
    Functions: {
      generate_order_number: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      payment_method_enum: PaymentMethod
      payment_status_enum: PaymentStatus
      order_status_enum: OrderStatus
      cart_action_enum: CartAction
      device_type_enum: DeviceType
    }
    CompositeTypes: Record<string, never>
  }
}
