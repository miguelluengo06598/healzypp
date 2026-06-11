// ─────────────────────────────────────────────────────────────────────────────
// useMetaPixel — Hook para disparar eventos de Meta Pixel + CAPI.
// Cada evento genera un event_id para deduplicación Browser ↔ CAPI.
// Solo se ejecuta si hay consentimiento y fbq() está disponible.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useCallback } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import { generateEventId, getPurchaseEventId } from '@/lib/meta/pixel'

interface ProductData {
  id: number
  slug?: string
  name: string
  price: number
  currency?: string
}

interface CartData {
  value: number
  currency: string
  items: { id: number; name: string; quantity: number; price: number }[]
}

interface OrderData {
  orderId: string
  orderNumber: string
  value: number
  currency: string
  items: { id: number; name: string; quantity: number; price: number }[]
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  zip?: string
}

function getFbq(): Window['fbq'] | null {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    return window.fbq
  }
  return null
}

async function sendCAPI(
  eventName: string,
  eventId: string,
  customData: Record<string, unknown>,
  userData?: { email?: string; phone?: string; firstName?: string; lastName?: string; city?: string; zip?: string }
) {
  try {
    await fetch('/api/meta/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id:   eventId,
        event_data: customData,
        user_data:  userData ?? {},
      }),
      keepalive: true,
    })
  } catch (err) {
    console.error('[MetaPixel] CAPI error:', err instanceof Error ? err.message : err)
  }
}

export function useMetaPixel() {
  const { consent } = useCookieConsent()
  const enabled = consent === 'granted'

  const track = useCallback(
    (
      eventName: string,
      parameters: Record<string, unknown> = {},
      userData?: OrderData,
      overrideEventId?: string
    ) => {
      if (!enabled) return
      const fbq = getFbq()
      const eventId = overrideEventId ?? generateEventId()

      if (fbq) {
        fbq('track', eventName, parameters, { eventID: eventId })
      }

      const capiUser = userData
        ? {
            email:     userData.email,
            phone:     userData.phone,
            firstName: userData.firstName,
            lastName:  userData.lastName,
            city:      userData.city,
            zip:       userData.zip,
          }
        : undefined

      sendCAPI(eventName, eventId, parameters, capiUser)
    },
    [enabled]
  )

  const trackPageView = useCallback(() => {
    const fbq = getFbq()
    if (fbq && enabled) {
      fbq('track', 'PageView')
    }
  }, [enabled])

  const trackViewContent = useCallback(
    (product: ProductData) => {
      track('ViewContent', {
        content_ids:  [product.slug ?? String(product.id)],
        content_name: product.name,
        content_type: 'product',
        value:        product.price,
        currency:     product.currency ?? 'EUR',
      })
    },
    [track]
  )

  const trackAddToCart = useCallback(
    (product: ProductData, quantity = 1) => {
      track('AddToCart', {
        content_ids:  [product.slug ?? String(product.id)],
        content_name: product.name,
        content_type: 'product',
        value:        product.price * quantity,
        currency:     product.currency ?? 'EUR',
        num_items:    quantity,
      })
    },
    [track]
  )

  const trackInitiateCheckout = useCallback(
    (cart: CartData) => {
      track('InitiateCheckout', {
        value:        cart.value,
        currency:     cart.currency,
        content_ids:  cart.items.map((i) => String(i.id)),
        num_items:    cart.items.reduce((sum, i) => sum + i.quantity, 0),
      })
    },
    [track]
  )

  /** Dispara Purchase en navegador + CAPI con el event_id indicado.
   *  Pasar `purchase_${orderNumber}` garantiza deduplicación con el CAPI del servidor. */
  const trackPurchase = useCallback(
    (order: OrderData, overrideEventId?: string) => {
      const eventId = overrideEventId ?? getPurchaseEventId(order.orderNumber)
      track(
        'Purchase',
        {
          content_ids:  order.items.map((i) => String(i.id)),
          content_name: 'Compra HEALZYP',
          content_type: 'product',
          value:        order.value,
          currency:     order.currency,
          num_items:    order.items.reduce((sum, i) => sum + i.quantity, 0),
          order_id:     order.orderNumber,
        },
        order,
        eventId
      )
    },
    [track]
  )

  return {
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
  }
}
