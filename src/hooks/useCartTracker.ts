// ─────────────────────────────────────────────────────────────────────────────
// useCartTracker — Rastrea acciones del carrito: add, remove, update
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useCallback } from 'react'
import { getTrackingClient } from '@/lib/tracking-client'
import { getCurrentUrl } from '@/lib/tracking-utils'
import type { CartAction, CartActionInput } from '@/types/tracking.types'

interface CartItem {
  productId: number
  bundleId?: number | null
  quantity: number
  unitPrice?: number
}

export function useCartTracker() {
  const client = getTrackingClient()

  const trackCartAction = useCallback(
    (action: CartAction, item: CartItem, cartTotal?: number) => {
      const event: CartActionInput = {
        eventType: 'cart_action',
        url: getCurrentUrl(),
        productId: item.productId,
        bundleId: item.bundleId ?? null,
        action,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? null,
        cartTotal: cartTotal ?? null,
      }
      client.track(event)
    },
    [client]
  )

  const trackAddToCart = useCallback(
    (item: CartItem, cartTotal?: number) =>
      trackCartAction('add', item, cartTotal),
    [trackCartAction]
  )

  const trackRemoveFromCart = useCallback(
    (item: CartItem, cartTotal?: number) =>
      trackCartAction('remove', item, cartTotal),
    [trackCartAction]
  )

  const trackUpdateCart = useCallback(
    (item: CartItem, cartTotal?: number) =>
      trackCartAction('update', item, cartTotal),
    [trackCartAction]
  )

  return {
    trackCartAction,
    trackAddToCart,
    trackRemoveFromCart,
    trackUpdateCart,
  }
}
