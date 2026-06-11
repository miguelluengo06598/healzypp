'use server'

import { z } from 'zod'
import { createOrder } from '@/lib/db/orders'
import type { CreateOrderResult } from '@/lib/db/orders'
import { orderIpRatelimit, orderPhoneRatelimit, getClientIpFromHeaders } from '@/lib/rate-limit'
import { sendPushover } from '@/lib/notifications/pushover'
import { BUNDLES } from '@/lib/bundles'
import { getCurrentUserId } from '@/lib/supabase-server'
import { sendPurchaseCAPI } from '@/lib/meta/capi'

const SPANISH_PHONE = /^(\+34|0034|34)?[6789]\d{8}$/
const POSTCODE_ES   = /^\d{5}$/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CreateOrderSchema = z.object({
  customerData: z.object({
    fullName:   z.string().min(2).max(150).trim(),
    phone:      z.string().transform(v => v.replace(/[\s\-]/g, '')).refine(v => SPANISH_PHONE.test(v), 'Teléfono español no válido'),
    email:      z.string().regex(EMAIL_RE, 'Email no válido').optional(),
    address:    z.string().min(5).max(200).trim(),
    postalCode: z.string().regex(POSTCODE_ES, 'Código postal no válido'),
    city:       z.string().min(2).max(100).trim(),
    province:   z.string().min(2).max(100).trim(),
  }),
  bundleId:               z.number().int().min(1).max(3),
  bundlePriceInCents:     z.number().int().min(0).optional(),
  paymentMethod:          z.enum(['CARD', 'COD']),
  stripePaymentIntentId:  z.string().startsWith('pi_').optional(),
  customerNotes:          z.string().max(500).optional(),
})

export async function createOrderAction(
  input: unknown
): Promise<CreateOrderResult> {
  // Rate limit por IP: 5 pedidos/hora
  const ip = await getClientIpFromHeaders()
  const { success: ipAllowed } = await orderIpRatelimit.limit(ip)
  if (!ipAllowed) {
    return { success: false, error: 'Demasiados intentos desde esta red. Inténtalo más tarde.' }
  }

  const parsed = CreateOrderSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { success: false, error: first?.message ?? 'Datos de pedido inválidos.' }
  }

  // Rate limit por teléfono: 3 pedidos/hora (mitiga spam de COD)
  const phone = parsed.data.customerData.phone
  const { success: phoneAllowed } = await orderPhoneRatelimit.limit(phone)
  if (!phoneAllowed) {
    return { success: false, error: 'Demasiados pedidos con este teléfono. Inténtalo más tarde.' }
  }

  const userId = (await getCurrentUserId()) ?? undefined
  const result = await createOrder({ ...parsed.data, userId })

  // Notificaciones y CAPI para pedidos COD (fire-and-forget)
  if (result.success && parsed.data.paymentMethod === 'COD') {
    const bundle = BUNDLES.find(b => b.id === parsed.data.bundleId)
    const totalEur = bundle ? bundle.priceInCents / 100 : 0
    const itemsText = `· ${bundle?.name ?? 'Producto'} x1`
    const names = parsed.data.customerData.fullName.split(' ')

    sendPushover({
      title: '🛒 Nuevo pedido COD',
      message: `👤 ${parsed.data.customerData.fullName}\n💰 ${totalEur.toFixed(2)}€ · Contra reembolso\n📦 ${itemsText}\n📍 ${parsed.data.customerData.city}`,
      priority: 1,
      sound: 'cashregister',
      url: `https://healzyp.com/admin/orders/${result.orderId}`,
      url_title: 'Ver pedido',
    }).catch((e) => console.error('[createOrderAction] Pushover error:', e))

    // Meta CAPI Purchase — event_id determinístico para deduplicar con el browser
    if (result.orderNumber) {
      sendPurchaseCAPI({
        orderNumber: result.orderNumber,
        email:       parsed.data.customerData.email ?? null,
        phone:       parsed.data.customerData.phone,
        firstName:   names[0],
        lastName:    names.slice(1).join(' ') || null,
        city:        parsed.data.customerData.city,
        zip:         parsed.data.customerData.postalCode,
        totalEur,
        contentIds:  [String(parsed.data.bundleId)],
      }).catch((e) => console.error('[createOrderAction] CAPI Purchase error:', e))
    }
  }

  return result
}
