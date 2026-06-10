// ─────────────────────────────────────────────────────────────────────────────
// CheckoutTracker — Hook helper para trackear checkout y conversión
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useCallback } from 'react'
import { getTrackingClient } from '@/lib/tracking-client'
import { getCurrentUrl } from '@/lib/tracking-utils'
import type { CheckoutInput, ConversionInput } from '@/types/tracking.types'

export function useCheckoutTracker() {
  const client = getTrackingClient()

  const trackCheckoutStart = useCallback(
    (cartTotal: number, itemsCount: number) => {
      const event: CheckoutInput = {
        eventType: 'checkout_start',
        url: getCurrentUrl(),
        step: 'init',
        cartTotal,
        itemsCount,
      }
      client.track(event)
    },
    [client]
  )

  const trackCheckoutComplete = useCallback(
    (orderId: string, orderNumber: string, totalAmount: number, itemsCount: number, paymentMethod: string) => {
      const event: ConversionInput = {
        eventType: 'conversion',
        url: getCurrentUrl(),
        orderId,
        orderNumber,
        totalAmount,
        itemsCount,
        paymentMethod,
      }
      client.track(event)

      // También marcar checkout como completado
      const checkoutEvent: CheckoutInput = {
        eventType: 'checkout_complete',
        url: getCurrentUrl(),
        cartTotal: totalAmount,
        itemsCount,
      }
      client.track(checkoutEvent)
    },
    [client]
  )

  return { trackCheckoutStart, trackCheckoutComplete }
}
