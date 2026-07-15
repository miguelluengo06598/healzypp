"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { ShippingMethod } from "@/hooks/useCheckout"

interface ShippingOption extends ShippingMethod {
  isFree?: boolean
}

interface ShippingMethodSectionProps {
  subtotalEur: number
  selected: ShippingMethod | null
  onSelect: (method: ShippingMethod) => void
  onComplete: (method: ShippingMethod) => void
  isCompleted: boolean
  onEdit: () => void
}

function fmtEur(n: number) {
  return n.toFixed(2).replace(".", ",") + "€"
}

export default function ShippingMethodSection({
  subtotalEur,
  selected,
  onSelect,
  onComplete,
  isCompleted,
  onEdit,
}: ShippingMethodSectionProps) {
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shipping/calculate?subtotal=${subtotalEur}`)
      .then((r) => r.json())
      .then((data) => {
        setOptions(data.options ?? [])
        // Auto-select first option if nothing selected
        if (!selected && data.options?.[0]) {
          onSelect(data.options[0])
        }
      })
      .finally(() => setLoading(false))
  }, [subtotalEur]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isCompleted && selected) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-1">
              Método de envío
            </p>
            <p className="text-sm font-medium">{selected.name}</p>
            <p className="text-sm text-black/60">
              {selected.estimatedDays} ·{" "}
              {selected.price === 0 ? (
                <span className="text-[#487D26] font-semibold">GRATIS</span>
              ) : (
                fmtEur(selected.price)
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-[#487D26] hover:underline font-medium ml-4"
          >
            Editar
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-[#E5E5E5] p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
          3
        </div>
        <h2 className="font-semibold text-base">Método de envío</h2>
      </div>

      {loading ? (
        <div className="flex gap-2 items-center text-sm text-black/40 py-4">
          <div className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
          Calculando opciones de envío…
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {options.map((opt) => {
            const isSelected = selected?.id === opt.id
            return (
              <label
                key={opt.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                  isSelected
                    ? "border-[#487D26] bg-[#F0F4EC]"
                    : "border-[#E5E5E5] hover:border-black/30"
                )}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={opt.id}
                  checked={isSelected}
                  onChange={() => onSelect(opt)}
                  className="accent-[#487D26] w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{opt.name}</p>
                  <p className="text-xs text-black/50">
                    {opt.description} · {opt.estimatedDays}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold shrink-0",
                    opt.price === 0 || opt.isFree ? "text-[#487D26]" : "text-black"
                  )}
                >
                  {opt.price === 0 || opt.isFree ? "GRATIS" : fmtEur(opt.price)}
                </span>
              </label>
            )
          })}
        </div>
      )}

      <button
        type="button"
        disabled={!selected}
        onClick={() => selected && onComplete(selected)}
        className={cn(
          "mt-5 w-full sm:w-auto sm:self-end rounded-xl text-white font-semibold px-8 py-3 text-sm transition-colors",
          selected
            ? "bg-[#487D26] hover:bg-[#3a6620]"
            : "bg-[#3a6620]/85 cursor-not-allowed"
        )}
      >
        Continuar con el pago →
      </button>
    </section>
  )
}
