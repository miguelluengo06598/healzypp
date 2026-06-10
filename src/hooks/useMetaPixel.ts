// ─────────────────────────────────────────────────────────────────────────────
// useMetaPixel — Hook type-safe para disparar eventos de Meta Pixel + CAPI.
// Cada evento genera un event_id único para deduplicación Browser ↔ CAPI.
// Solo se ejecuta si hay consentimiento y fbq() está disponible.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useCallback } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import { getCurrentUrl } from '@/lib/tracking-utils'

interface ProductData {
  id: number
  slug: string
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

function generateEventId(): string {
  return `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
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
        event_id: eventId,
        event_data: customData,
        user_data: userData ?? {},
      }),
      keepalive: true,
    })
  } catch (err) {
    // Silencioso: no bloquear el flujo de compra si CAPI falla
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
      userData?: OrderData
    ) => {
      if (!enabled) return
      const fbq = getFbq()
      const eventId = generateEventId()

      // 1. Browser Pixel
      if (fbq) {
        fbq('track', eventName, parameters, { eventID: eventId })
      }

      // 2. Conversions API (server-side) en paralelo
      const capiUser = userData
        ? {
            email: userData.email,
            phone: userData.phone,
            firstName: userData.firstName,
            lastName: userData.lastName,
            city: userData.city,
            zip: userData.zip,
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
        content_ids: [product.slug],
        content_name: product.name,
        content_type: 'product',
        value: product.price,
        currency: product.currency ?? 'EUR',
      })
    },
    [track]
  )

  const trackAddToCart = useCallback(
    (product: ProductData, quantity = 1) => {
      track('AddToCart', {
        content_ids: [product.slug],
        content_name: product.name,
        content_type: 'product',
        value: product.price * quantity,
        currency: product.currency ?? 'EUR',
        num_items: quantity,
      })
    },
    [track]
  )

  const trackInitiateCheckout = useCallback(
    (cart: CartData) => {
      track('InitiateCheckout', {
        value: cart.value,
        currency: cart.currency,
        content_ids: cart.items.map((i) => String(i.id)),
        num_items: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      })
    },
    [track]
  )

  const trackPurchase = useCallback(
    (order: OrderData) => {
      track(
        'Purchase',
        {
          content_ids: order.items.map((i) => String(i.id)),
          content_name: 'Compra HEALZYP',
          content_type: 'product',
          value: order.value,
          currency: order.currency,
          num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
          order_id: order.orderNumber,
        },
        order
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
