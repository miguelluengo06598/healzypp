"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import type { CouponState } from "@/hooks/useCheckout"

interface CouponInputProps {
  subtotalEur: number
  coupon: CouponState | null
  onChange: (coupon: CouponState | null) => void
}

export default function CouponInput({ subtotalEur, coupon, onChange }: CouponInputProps) {
  const [code, setCode] = useState(coupon?.code ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotalEur }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Cupón no válido.")
        onChange(null)
      } else {
        onChange({
          code: trimmed,
          discount: data.discountEur,
          type: data.type,
          percentageOff: data.percentageOff,
        })
      }
    } catch {
      setError("Error al validar el cupón. Inténtalo de nuevo.")
      onChange(null)
    } finally {
      setLoading(false)
    }
  }

  const remove = () => {
    setCode("")
    setError(null)
    onChange(null)
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#F0F4EC] border border-[#487D26]/20 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#487D26] tracking-wide">{coupon.code}</span>
          <span className="text-xs text-[#487D26]">
            — -{coupon.discount.toFixed(2).replace(".", ",")}€ descuento
          </span>
        </div>
        <button
          type="button"
          onClick={remove}
          className="text-xs text-black/40 hover:text-black transition-colors ml-3"
        >
          Eliminar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Código de descuento"
          className={cn(
            "flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none transition-all",
            error
              ? "border-red-400 focus:ring-1 focus:ring-red-400/30"
              : "border-[#E5E5E5] focus:border-[#487D26] focus:ring-1 focus:ring-[#487D26]/20"
          )}
        />
        <button
          type="button"
          onClick={apply}
          disabled={loading || !code.trim()}
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
            loading || !code.trim()
              ? "bg-[#E5E5E5] text-black/40 cursor-not-allowed"
              : "bg-black text-white hover:bg-black/80"
          )}
        >
          {loading ? "..." : "Aplicar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
