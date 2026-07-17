"use client"

import React, { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { CartItem } from "@/lib/features/carts/cartsSlice"
import type { CouponState, ShippingMethod } from "@/hooks/useCheckout"
import CouponInput from "./CouponInput"
import { FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/shipping"
import { eurosToCents, centsToEuros } from "@/lib/money"

interface CartOrderSummaryProps {
  items: CartItem[]
  subtotalEur: number
  shippingMethod: ShippingMethod | null
  coupon: CouponState | null
  onCouponChange: (coupon: CouponState | null) => void
  /** Mobile: collapse/expand behaviour */
  collapsible?: boolean
}

function fmtEur(n: number) {
  return n.toFixed(2).replace(".", ",") + "€"
}

// En céntimos: el Math.round en euros de antes convertía 49,99€ en 50€
function calcItemAdjustedPrice(item: CartItem): number {
  const priceCents = eurosToCents(item.price)
  if (item.discount.percentage > 0) {
    return centsToEuros(Math.round(priceCents * (1 - item.discount.percentage / 100)))
  }
  if (item.discount.amount > 0) {
    return centsToEuros(priceCents - eurosToCents(item.discount.amount))
  }
  return item.price
}

export default function CartOrderSummary({
  items,
  subtotalEur,
  shippingMethod,
  coupon,
  onCouponChange,
  collapsible = false,
}: CartOrderSummaryProps) {
  const [collapsed, setCollapsed] = useState(collapsible)

  const shippingCostEur = shippingMethod?.price ?? null
  const couponDiscountEur = coupon?.discount ?? 0
  const shippingIsFree =
    shippingMethod?.id === "standard" && subtotalEur >= FREE_SHIPPING_THRESHOLD_EUR

  // Aritmética en céntimos para que la suma no arrastre decimales binarios
  const totalEur = centsToEuros(
    Math.max(
      0,
      eurosToCents(subtotalEur) -
        eurosToCents(couponDiscountEur) +
        eurosToCents(shippingCostEur ?? 0)
    )
  )

  return (
    <div className="bg-[#FAFAFA] rounded-2xl border border-[#E5E5E5] overflow-hidden">
      {/* Mobile toggle header */}
      {collapsible && (
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium"
          onClick={() => setCollapsed((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#487D26]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {collapsed ? "Ver resumen del pedido" : "Ocultar resumen"}
          </span>
          <span className="font-bold text-[#487D26]">{fmtEur(totalEur)}</span>
        </button>
      )}

      <div className={cn(collapsible && collapsed ? "hidden" : "block")}>
        {/* Product list */}
        <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
          {items.map((item, idx) => {
            const adjPrice = calcItemAdjustedPrice(item)
            return (
              <div key={`${item.id}-${idx}`} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl bg-[#F0EEED] overflow-hidden shrink-0 border border-black/5">
                  <Image
                    src={item.srcUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                  <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{item.name}</p>
                  {item.attributes.length > 0 && (
                    <p className="text-xs text-black/50 mt-0.5">{item.attributes.join(" / ")}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-black shrink-0">
                  {fmtEur(centsToEuros(eurosToCents(adjPrice) * item.quantity))}
                </span>
              </div>
            )
          })}
        </div>

        <div className="px-5 pb-4">
          <CouponInput
            subtotalEur={subtotalEur}
            coupon={coupon}
            onChange={onCouponChange}
          />
        </div>

        <hr className="border-[#E5E5E5] mx-5" />

        {/* Pricing breakdown */}
        <dl className="px-5 py-4 flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between text-black/60">
            <dt>Subtotal</dt>
            <dd className="font-medium text-black">{fmtEur(subtotalEur)}</dd>
          </div>

          {couponDiscountEur > 0 && (
            <div className="flex justify-between text-[#487D26]">
              <dt className="font-medium">Descuento ({coupon?.code})</dt>
              <dd className="font-semibold">-{fmtEur(couponDiscountEur)}</dd>
            </div>
          )}

          <div className="flex justify-between text-black/60">
            <dt>Envío</dt>
            <dd>
              {shippingCostEur === null ? (
                <span className="text-black/40">— calculado al siguiente paso</span>
              ) : shippingCostEur === 0 || shippingIsFree ? (
                <span className="text-[#487D26] font-semibold">GRATIS</span>
              ) : (
                <span className="font-medium text-black">{fmtEur(shippingCostEur)}</span>
              )}
            </dd>
          </div>
        </dl>

        <hr className="border-[#E5E5E5] mx-5" />

        <div className="px-5 py-4 flex justify-between items-center">
          <span className="font-bold text-base">Total</span>
          <span className="text-xl font-bold text-[#487D26]">{fmtEur(totalEur)}</span>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-black/40 text-center leading-relaxed">
            🔒 Pago seguro · 🚚 Envío gratis +{FREE_SHIPPING_THRESHOLD_EUR}€ · ↩️ Devolución gratuita 30 días
          </p>
        </div>
      </div>
    </div>
  )
}
