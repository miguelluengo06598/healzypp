"use client"

import React, { useState } from "react"
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { cn } from "@/lib/utils"
import { FaLock } from "react-icons/fa"
import PaymentIcons from "@/components/common/PaymentIcons"

type CardField = "number" | "expiry" | "cvc"

interface PaymentSectionProps {
  totalEur: number
  loading: boolean
  error: string | null
  onSubmit: (paymentMethodId: string) => void
}

const STRIPE_STYLE = {
  base: {
    fontSize: "14px",
    fontFamily: "inherit",
    color: "#111111",
    "::placeholder": { color: "#9CA3AF" },
  },
  invalid: { color: "#ef4444" },
}

const cardWrapCls = (error?: string, focused?: boolean, success?: boolean) =>
  cn(
    "w-full rounded-xl px-4 py-3 border text-sm transition-all cursor-text",
    error
      ? "border-red-400 ring-1 ring-red-400/30"
      : focused
      ? "border-[#487D26] ring-1 ring-[#487D26]/20"
      : success
      ? "border-[#487D26]"
      : "border-[#E5E5E5]"
  )

function fmtEur(n: number) {
  return n.toFixed(2).replace(".", ",") + "€"
}

function translateStripeError(msg?: string): string {
  if (!msg) return "Error al procesar el pago. Inténtalo de nuevo."
  const m = msg.toLowerCase()
  if (m.includes("card was declined") || m.includes("do not honor"))
    return "Tu tarjeta fue rechazada. Contacta con tu banco."
  if (m.includes("insufficient funds"))
    return "Fondos insuficientes en la tarjeta."
  if (m.includes("incorrect cvc") || m.includes("cvc"))
    return "El código CVC de la tarjeta es incorrecto."
  if (m.includes("expired"))
    return "La tarjeta ha caducado. Usa otra tarjeta."
  if (m.includes("incorrect number") || m.includes("invalid number"))
    return "El número de tarjeta no es válido."
  if (m.includes("processing error"))
    return "Error de procesamiento. Inténtalo de nuevo en unos segundos."
  if (m.includes("authentication"))
    return "Se requiere autenticación adicional. Sigue los pasos de tu banco."
  if (m.includes("lost card") || m.includes("stolen card"))
    return "Tu tarjeta ha sido dada de baja. Usa otra tarjeta."
  return msg
}

export default function PaymentSection({
  totalEur,
  loading,
  error,
  onSubmit,
}: PaymentSectionProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [cardErrors, setCardErrors] = useState<Partial<Record<CardField, string>>>({})
  const [cardComplete, setCardComplete] = useState<Record<CardField, boolean>>({
    number: false,
    expiry: false,
    cvc: false,
  })
  const [cardFocus, setCardFocus] = useState<CardField | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    if (!cardComplete.number || !cardComplete.expiry || !cardComplete.cvc) return

    const cardElement = elements.getElement(CardNumberElement)!
    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    })

    if (pmError) {
      // Surface Stripe PM error through parent's error channel
      onSubmit("__error__:" + (pmError.message ?? ""))
      return
    }

    onSubmit(paymentMethod.id)
  }

  const cardErrors2 = { ...cardErrors, ...({} as Record<CardField, string | undefined>) }
  const allComplete = cardComplete.number && cardComplete.expiry && cardComplete.cvc
  const disabled = loading || !allComplete || !stripe

  return (
    <section className="bg-white rounded-2xl border border-[#E5E5E5] p-5 md:p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
            4
          </div>
          <h2 className="font-semibold text-base">Pago</h2>
        </div>
        <div className="flex items-center gap-1">
          {["VISA", "MC", "AMEX"].map((b) => (
            <span
              key={b}
              className="text-[9px] font-bold tracking-wide text-black/35 border border-black/10 rounded-[4px] px-1.5 py-[3px] bg-white leading-none"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-black/40 mb-5 flex items-center gap-2">
        <FaLock className="text-[9px] text-[#487D26]" />
        Todos tus datos están encriptados con SSL 256-bit
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Card number */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60 uppercase tracking-wide">
            Número de tarjeta
          </label>
          <div className={cardWrapCls(cardErrors2.number, cardFocus === "number", cardComplete.number && !cardErrors2.number)}>
            <CardNumberElement
              options={{ style: STRIPE_STYLE, showIcon: true }}
              onFocus={() => setCardFocus("number")}
              onBlur={() => setCardFocus(null)}
              onChange={(e) => {
                setCardErrors((p) => ({ ...p, number: e.error?.message }))
                setCardComplete((p) => ({ ...p, number: e.complete }))
              }}
            />
          </div>
          {cardErrors2.number && <p className="text-xs text-red-500">{cardErrors2.number}</p>}
        </div>

        {/* Expiry + CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-black/60 uppercase tracking-wide">
              Fecha de caducidad
            </label>
            <div className={cardWrapCls(cardErrors2.expiry, cardFocus === "expiry", cardComplete.expiry && !cardErrors2.expiry)}>
              <CardExpiryElement
                options={{ style: STRIPE_STYLE }}
                onFocus={() => setCardFocus("expiry")}
                onBlur={() => setCardFocus(null)}
                onChange={(e) => {
                  setCardErrors((p) => ({ ...p, expiry: e.error?.message }))
                  setCardComplete((p) => ({ ...p, expiry: e.complete }))
                }}
              />
            </div>
            {cardErrors2.expiry && <p className="text-xs text-red-500">{cardErrors2.expiry}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-black/60 uppercase tracking-wide">
              CVC
            </label>
            <div className={cardWrapCls(cardErrors2.cvc, cardFocus === "cvc", cardComplete.cvc && !cardErrors2.cvc)}>
              <CardCvcElement
                options={{ style: STRIPE_STYLE }}
                onFocus={() => setCardFocus("cvc")}
                onBlur={() => setCardFocus(null)}
                onChange={(e) => {
                  setCardErrors((p) => ({ ...p, cvc: e.error?.message }))
                  setCardComplete((p) => ({ ...p, cvc: e.complete }))
                }}
              />
            </div>
            {cardErrors2.cvc && <p className="text-xs text-red-500">{cardErrors2.cvc}</p>}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {translateStripeError(error)}
          </div>
        )}

        <button
          type="submit"
          disabled={disabled}
          className={cn(
            "w-full rounded-xl h-14 text-base font-bold text-white transition-all flex items-center justify-center gap-2",
            disabled ? "bg-[#487D26]/50 cursor-not-allowed" : "bg-[#487D26] hover:bg-[#3a6620]"
          )}
        >
          <FaLock className="text-sm" />
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Procesando pago…
            </>
          ) : (
            `Confirmar pedido — ${fmtEur(totalEur)}`
          )}
        </button>

        <PaymentIcons className="justify-center" />

        <p className="text-[11px] text-black/30 text-center">
          🔒 Pago seguro · PCI DSS nivel 1 · ↩️ Devolución gratuita en 30 días
        </p>
      </form>
    </section>
  )
}
