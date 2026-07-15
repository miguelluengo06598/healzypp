// ─────────────────────────────────────────────────────────────────────────────
// Pedidos del usuario autenticado — server-only (usa cookies de sesión).
//
// A diferencia de src/lib/db/orders.ts (service client, bypassa RLS), aquí se
// usa el cliente anon con la sesión del usuario: la política RLS
// orders_select_own (auth.uid() = user_id, ver supabase/schema.sql) hace el
// scoping EN la base de datos. Sin userId como parámetro a propósito — así no
// existe la clase de bug IDOR que se eliminó con getOrderByNumber (Fase 5).
//
// Vive en archivo propio (y no en orders.ts) para no acoplar el módulo que
// consume el webhook de Stripe a next/headers.
// ─────────────────────────────────────────────────────────────────────────────

import { getServerSupabase } from '@/lib/supabase-server'
import type { OrderStatusEnum } from '@/types/database.types'

export interface UserOrderItem {
  id: string
  nombre_producto: string
  cantidad: number
  precio_total: number
}

export interface UserOrderTrackingEvent {
  estado: OrderStatusEnum
  descripcion: string | null
  numero_tracking: string | null
  empresa_envio: string | null
  fecha_creacion: string
}

export interface UserOrderWithDetails {
  id: string
  numero_pedido: string
  estado: OrderStatusEnum
  total: number
  fecha_creacion: string
  fecha_actualizacion: string
  order_items: UserOrderItem[]
  order_tracking: UserOrderTrackingEvent[]
}

/**
 * Pedidos del usuario de la sesión actual, más recientes primero.
 * Devuelve [] si no hay pedidos (o no hay sesión — RLS no deja ver nada),
 * y null si la consulta falló (para distinguir "vacío" de "error").
 */
export async function getOrdersByUser(): Promise<UserOrderWithDetails[] | null> {
  try {
    const supabase = await getServerSupabase()
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        numero_pedido,
        estado,
        total,
        fecha_creacion,
        fecha_actualizacion,
        order_items (
          id,
          nombre_producto,
          cantidad,
          precio_total
        ),
        order_tracking (
          estado,
          descripcion,
          numero_tracking,
          empresa_envio,
          fecha_creacion
        )
      `
      )
      .order('fecha_creacion', { ascending: false })

    if (error) {
      console.error('[getOrdersByUser] error:', error.message)
      return null
    }

    return (data ?? []) as unknown as UserOrderWithDetails[]
  } catch (err) {
    console.error('[getOrdersByUser] error inesperado:', err)
    return null
  }
}
