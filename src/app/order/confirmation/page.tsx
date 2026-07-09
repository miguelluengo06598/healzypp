"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { integralCF } from "@/styles/fonts"
import { cn } from "@/lib/utils"
import { FaCheckCircle } from "react-icons/fa"
import { useMetaPixel } from "@/hooks/useMetaPixel"
import { getPurchaseEventId } from "@/lib/meta/pixel"

interface OrderItem {
  name: string
  srcUrl: string
  quantity: number
  attributes: string[]
  price: number
  discount: number
}

interface OrderData {
  orderNumber: string
  email: string
  firstName: string
  items: OrderItem[]
  shippingAddress: {
    firstName: string
    lastName: string
    address: string
    apartment: string
    postalCode: string
    city: string
    province: string
    country: string
  }
  shippingMethod: {
    name: string
    estimatedDays: string
    price: number
  }
  subtotalEur: number
  shippingCostEur: number
  couponDiscountEur: number
  totalEur: number
}

function fmtEur(n: number) {
  return n.toFixed(2).replace(".", ",") + " €"
}

function calcItemPrice(item: OrderItem): number {
  if (item.discount > 0) {
    return item.price * (1 - item.discount / 100)
  }
  return item.price
}

export default function ConfirmationPage() {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [missing, setMissing] = useState(false)
  const { trackPurchase } = useMetaPixel()
  const purchaseFiredRef = useRef(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("healzyp_order")
      if (!raw) {
        setMissing(true)
        return
      }
      setOrder(JSON.parse(raw) as OrderData)
    } catch {
      setMissing(true)
    }
  }, [])

  // Dispara Purchase una sola vez cuando los datos del pedido estén disponibles.
  // Usa event_id determinístico para deduplicación con el CAPI del servidor.
  useEffect(() => {
    if (!order || purchaseFiredRef.current) return
    purchaseFiredRef.current = true

    trackPurchase(
      {
        orderId:     order.orderNumber,
        orderNumber: order.orderNumber,
        value:       order.totalEur,
        currency:    'EUR',
        items:       order.items.map((item, i) => ({
          id:       i + 1,
          name:     item.name,
          quantity: item.quantity,
          price:    item.price,
        })),
        email:     order.email,
        firstName: order.firstName,
        lastName:  order.shippingAddress.lastName,
        city:      order.shippingAddress.city,
        zip:       order.shippingAddress.postalCode,
      },
      getPurchaseEventId(order.orderNumber)
    )
  }, [order, trackPurchase])

  if (missing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <FaCheckCircle className="text-5xl text-[#487D26]" />
        <h1 className={cn(integralCF.className, "text-2xl")}>Pedido completado</h1>
        <p className="text-black/50 text-sm max-w-xs">
          No encontramos los detalles de tu pedido en esta sesión. Es posible que ya hayas cerrado
          la página o que el pedido se procesara en otro dispositivo.
        </p>
        <Link
          href="/shop"
          className="mt-2 rounded-full bg-black text-white px-8 py-3 text-sm font-semibold hover:bg-black/80 transition-colors"
        >
          Seguir comprando
        </Link>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#487D26]/30 border-t-[#487D26] rounded-full animate-spin" />
      </div>
    )
  }

  const hasDiscount = order.couponDiscountEur > 0

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="inline-flex"
          >
            <FaCheckCircle className="text-6xl text-[#487D26]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p className="mt-4 text-sm font-medium text-[#487D26] uppercase tracking-widest">
              Pedido confirmado
            </p>
            <h1 className={cn(integralCF.className, "text-3xl mt-1")}>
              ¡Gracias, {order.firstName}!
            </h1>
            <p className="text-black/50 text-sm mt-2">
              Recibirás una confirmación en{" "}
              <strong className="text-black">{order.email}</strong>
            </p>
            <p className="text-xs text-black/30 mt-1">
              Pedido&nbsp;
              <span className="font-mono font-semibold text-black/60">
                #{order.orderNumber}
              </span>
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-col gap-4"
        >
          {/* Items */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <h2 className="font-semibold text-sm mb-4">Artículos del pedido</h2>
            <div className="flex flex-col divide-y divide-[#F5F5F5]">
              {order.items.map((item, i) => {
                const unitPrice = calcItemPrice(item)
                return (
                  <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-[#F5F5F5]">
                      <Image
                        src={item.srcUrl}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
                      {item.attributes.length > 0 && (
                        <p className="text-xs text-black/40 mt-0.5">
                          {item.attributes.join(" · ")}
                        </p>
                      )}
                      <p className="text-xs text-black/40 mt-0.5">Cant.: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      {fmtEur(unitPrice * item.quantity)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Price summary */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <h2 className="font-semibold text-sm mb-4">Resumen del pago</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-black/60">Subtotal</span>
                <span>{fmtEur(order.subtotalEur)}</span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-[#487D26]">
                  <span>Cupón aplicado</span>
                  <span>−{fmtEur(order.couponDiscountEur)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-black/60">Envío</span>
                <span>
                  {order.shippingCostEur === 0 ? (
                    <span className="text-[#487D26] font-semibold">GRATIS</span>
                  ) : (
                    fmtEur(order.shippingCostEur)
                  )}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-[#F5F5F5] mt-1">
                <span>Total</span>
                <span>{fmtEur(order.totalEur)}</span>
              </div>
            </div>
          </div>

          {/* Shipping details */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <h2 className="font-semibold text-sm mb-4">Detalles de envío</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-1">
                  Dirección
                </p>
                <p className="font-medium">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p className="text-black/60">
                  {order.shippingAddress.address}
                  {order.shippingAddress.apartment
                    ? `, ${order.shippingAddress.apartment}`
                    : ""}
                </p>
                <p className="text-black/60">
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}
                </p>
                <p className="text-black/60">
                  {order.shippingAddress.province}, {order.shippingAddress.country}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-1">
                  Método de envío
                </p>
                <p className="font-medium">{order.shippingMethod.name}</p>
                <p className="text-black/60">{order.shippingMethod.estimatedDays}</p>
                <p className="text-black/60">
                  {order.shippingMethod.price === 0
                    ? "Envío gratuito"
                    : fmtEur(order.shippingMethod.price)}
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              href="/shop"
              className="flex-1 text-center rounded-full bg-black text-white px-8 py-3.5 text-sm font-semibold hover:bg-black/80 transition-colors"
            >
              Seguir comprando
            </Link>
            <Link
              href="/"
              className="flex-1 text-center rounded-full border border-black/20 text-black px-8 py-3.5 text-sm font-semibold hover:bg-black/5 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>

          <p className="text-center text-xs text-black/30 mt-2 pb-6">
            ¿Alguna pregunta? Escríbenos a{" "}
            <a href="mailto:hola@healzyp.com" className="underline hover:text-black/60">
              hola@healzyp.com
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
