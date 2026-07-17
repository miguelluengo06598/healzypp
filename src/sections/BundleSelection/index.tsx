"use client";

import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  BUNDLES,
  BASE_UNIT_PRICE_EUR,
  calcSavings,
  calcDiscountPct,
  calcUnitPrice,
  formatPriceEur,
} from "@/lib/bundles";
import { getBundleTitle, SELECTED_BUNDLE_STORAGE_KEY } from "./data";
import type { BundleId } from "./types";

const BundleSelection = () => {
  const [selected, setSelected] = useState<BundleId>(2);
  const [bounceId, setBounceId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(SELECTED_BUNDLE_STORAGE_KEY, JSON.stringify({ id: selected }));
  }, [selected]);

  const handleSelect = useCallback((id: number) => {
    setSelected(id);
    setBounceId(id);
    setTimeout(() => {
      setBounceId((curr) => (curr === id ? null : curr));
    }, 200);
  }, []);

  return (
    <div className="flex flex-col">
      <span className="text-sm text-black/60 mb-3">Elige tu plan</span>

      <div className="flex flex-col gap-3">
        {BUNDLES.map((bundle) => {
          const isSelected = selected === bundle.id;
          const isPopular = bundle.popular;
          const savings = calcSavings(bundle);
          const discountPct = calcDiscountPct(bundle);
          const strikePrice = (BASE_UNIT_PRICE_EUR * bundle.id)
            .toFixed(2)
            .replace(".", ",");

          return (
            <div
              key={bundle.id}
              className="relative"
              style={{ marginTop: isPopular ? 10 : undefined }}
            >
              {/* MÁS POPULAR badge */}
              {isPopular && (
                <span
                  className={cn(
                    "absolute left-4 z-10 text-[11px] font-bold uppercase tracking-wide rounded-[20px]",
                    "py-[3px] px-[10px]",
                    isSelected
                      ? "bg-white text-[#2d6a2d]"
                      : "bg-[#1a1a1a] text-white"
                  )}
                  style={{ top: 0, transform: "translateY(-50%)" }}
                >
                  MÁS POPULAR
                </span>
              )}

              <button
                type="button"
                onClick={() => handleSelect(bundle.id)}
                aria-pressed={isSelected}
                className={cn(
                  "relative w-full text-left rounded-[16px] transition-all duration-150 ease-out",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a2d] focus-visible:ring-offset-2",
                  isSelected
                    ? "border-[3px] border-[#1a4d1a] shadow-[0_4px_20px_rgba(45,106,45,0.35)]"
                    : "border-[2.5px] border-[#d1d5db] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[#2d6a2d] hover:shadow-[0_2px_12px_rgba(45,106,45,0.12)]",
                  bounceId === bundle.id && "animate-card-bounce"
                )}
                style={{
                  padding: "16px 20px",
                  background: isSelected
                    ? "linear-gradient(135deg, #2d6a2d 0%, #3d8b3d 100%)"
                    : undefined,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Izquierda: toda la info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "leading-tight",
                        isSelected ? "text-white" : "text-[#111827]"
                      )}
                      style={{ fontSize: 16, fontWeight: 600 }}
                    >
                      {getBundleTitle(bundle)}
                    </p>

                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span
                        className={isSelected ? "text-white" : "text-[#111827]"}
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {bundle.price}
                      </span>
                      {bundle.id > 1 && (
                        <span
                          className={cn(
                            "line-through",
                            isSelected ? "text-white/50" : "text-[#9ca3af]"
                          )}
                          style={{ fontSize: 14 }}
                        >
                          {strikePrice}€
                        </span>
                      )}
                    </div>

                    {savings > 0 ? (
                      <>
                        <p
                          className={
                            isSelected ? "text-[#bbf7d0]" : "text-[#2d6a2d]"
                          }
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            marginTop: 4,
                          }}
                        >
                          ✦ Ahorras {formatPriceEur(savings)}€ · {discountPct}% dto.
                        </p>
                        <p
                          className={
                            isSelected ? "text-white/80" : "text-[#6b7280]"
                          }
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            marginTop: 2,
                          }}
                        >
                          Solo {formatPriceEur(calcUnitPrice(bundle))}€/bote
                        </p>
                      </>
                    ) : (
                      <p
                        className={
                          isSelected ? "text-white/70" : "text-[#6b7280]"
                        }
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          marginTop: 4,
                        }}
                      >
                        Precio base
                      </p>
                    )}
                  </div>

                  {/* Derecha: radio button custom */}
                  <div
                    className={cn(
                      "w-[22px] h-[22px] rounded-full border-[2.5px] flex items-center justify-center shrink-0 transition-colors duration-150",
                      isSelected
                        ? "border-white bg-white"
                        : "border-[#d1d5db] bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "w-[10px] h-[10px] rounded-full transition-transform duration-150",
                        isSelected
                          ? "bg-[#2d6a2d] scale-100"
                          : "scale-0"
                      )}
                    />
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes card-bounce {
          0% { transform: scale(1); }
          30% { transform: scale(0.98); }
          60% { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
        .animate-card-bounce {
          animation: card-bounce 200ms ease-out;
        }
      `}</style>
    </div>
  );
};

export default BundleSelection;
