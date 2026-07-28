// ─────────────────────────────────────────────────────────────────────────────
// Tipos TypeScript para la base de datos Supabase
// Actualizado manualmente para coincidir con database/SETUP-COMPLETO.sql
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'CARD'
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

export type OrderStatusEnum =
  | 'pendiente'
  | 'pagado'
  | 'fallido'
  | 'procesando'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'reembolsado'

export type CouponTypeEnum = 'porcentaje' | 'fijo' | 'envio_gratis'

// ─── Row types ───────────────────────────────────────────────────────────────

export interface ProductRow {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  descripcion_corta: string | null
  precio: number
  precio_original: number | null
  imagenes: any
  categoria: string | null
  tags: any
  stock: number
  activo: boolean
  proveedor_id: string | null
  proveedor_sku: string | null
  peso_gramos: number
  meta_title: string | null
  meta_description: string | null
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface BundleRow {
  id: number
  product_id: string | null
  nombre: string
  cantidad: number
  precio: number
  precio_original: number | null
  ahorro: number | null
  porcentaje_dto: number | null
  precio_por_unidad: number | null
  es_popular: boolean
  orden: number | null
  activo: boolean
}

export interface ProfileRow {
  id: string
  nombre: string | null
  apellidos: string | null
  email: string | null
  telefono: string | null
  avatar_url: string | null
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface OrderRow {
  id: string
  numero_pedido: string
  user_id: string | null
  email_cliente: string | null
  nombre_cliente: string | null
  telefono_cliente: string | null
  estado: OrderStatusEnum
  subtotal: number
  descuento: number
  gastos_envio: number
  total: number
  metodo_pago: string | null
  stripe_payment_intent_id: string | null
  cupon_id: string | null
  direccion_envio: any
  notas_cliente: string | null
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface OrderItemRow {
  id: string
  order_id: string
  /** DORMANTE — siempre null desde la unificación del catálogo. Usa product_slug. */
  product_id: string | null
  /** Identificador real del producto (src/data/catalog.ts) — el webhook agrupa por esto para decrementar product_stock. */
  product_slug: string | null
  variant_id: string | null
  nombre_producto: string
  imagen_producto: string | null
  cantidad: number
  precio_unitario: number
  precio_total: number
  /** Unidades reales de stock (botes) a descontar de product_stock — bundle.cantidad × cantidad */
  unidades_stock: number | null
}

export interface OrderTrackingRow {
  id: string
  order_id: string
  estado: OrderStatusEnum
  descripcion: string | null
  numero_tracking: string | null
  empresa_envio: string | null
  fecha_creacion: string
}

export interface ReviewRow {
  id: string
  product_id: string | null
  order_id: string | null
  customer_name: string
  rating: number
  comment: string | null
  verified: boolean
  visible: boolean
  created_at: string
  updated_at: string
}

export interface ContactMessageRow {
  id: number
  name: string
  email: string
  message: string
  created_at: string
}

export interface CouponRow {
  id: string
  codigo: string
  tipo: CouponTypeEnum
  valor: number
  minimo_pedido: number | null
  maximo_descuento: number | null
  usos_totales: number | null
  usos_por_usuario: number | null
  usos_actuales: number
  fecha_inicio: string | null
  fecha_fin: string | null
  activo: boolean
  fecha_creacion: string
}

// ─── Insert / Update helpers ─────────────────────────────────────────────────

export type CustomerInsert = Omit<ProfileRow, 'fecha_creacion' | 'fecha_actualizacion'>

export type OrderInsert = Omit<OrderRow, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>

export type OrderItemInsert = Omit<OrderItemRow, 'id'>

export type ReviewInsert = Omit<ReviewRow, 'id' | 'created_at' | 'updated_at'>

export type ContactMessageInsert = Omit<ContactMessageRow, 'id' | 'created_at'>

// ─── Database interface (compatible con createClient<Database>) ──────────────

type NoRelationships = { Relationships: [] }

export interface Database {
  public: {
    Tables: {
      products: {
        Row: ProductRow
        Insert: Omit<ProductRow, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>
        Update: Partial<Omit<ProductRow, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>>
      } & NoRelationships
      bundles: {
        Row: BundleRow
        Insert: Omit<BundleRow, 'id'>
        Update: Partial<Omit<BundleRow, 'id'>>
      } & NoRelationships
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'fecha_creacion' | 'fecha_actualizacion'>
        Update: Partial<Omit<ProfileRow, 'fecha_creacion' | 'fecha_actualizacion'>>
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
      order_tracking: {
        Row: OrderTrackingRow
        Insert: Omit<OrderTrackingRow, 'id' | 'fecha_creacion'>
        Update: Partial<Omit<OrderTrackingRow, 'id' | 'fecha_creacion'>>
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
      coupons: {
        Row: CouponRow
        Insert: Omit<CouponRow, 'id' | 'fecha_creacion'>
        Update: Partial<Omit<CouponRow, 'id' | 'fecha_creacion'>>
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
      order_status_enum: OrderStatusEnum
      coupon_type_enum: CouponTypeEnum
      payment_method_enum: PaymentMethod
      payment_status_enum: PaymentStatus
      order_status_enum_legacy: OrderStatus
      cart_action_enum: CartAction
      device_type_enum: DeviceType
    }
    CompositeTypes: Record<string, never>
  }
}
