"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { BUNDLES, Bundle, calcSavings, calcDiscountPct, getBundlePriceEur } from "@/lib/bundles";
import { motion } from "framer-motion";

const BASE_UNIT_PRICE_EUR = 29.99;

type BundleId = Bundle["id"];

const BundleSelection = () => {
  const [selected, setSelected] = useState<BundleId>(2);

  useEffect(() => {
    localStorage.setItem("selectedBundle", JSON.stringify({ id: selected }));
  }, [selected]);

  return (
    <div className="flex flex-col">
      <span className="text-sm sm:text-base text-black/60 mb-4">
        Elige tu plan
      </span>

      <div className="flex flex-col gap-3">
        {BUNDLES.map((bundle) => {
          const isSelected = selected === bundle.id;
          const savings = calcSavings(bundle);
          const discountPct = calcDiscountPct(bundle);
          const unitTotal = (BASE_UNIT_PRICE_EUR * bundle.id).toFixed(2);

          return (
            <motion.button
              key={bundle.id}
              type="button"
              onClick={() => setSelected(bundle.id)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center justify-between px-5 py-4 rounded-[16px] transition-all border-2 text-left",
                isSelected
                  ? "bg-brand text-white border-brand shadow-[0_4px_16px_rgba(72,125,38,0.3)]"
                  : "bg-[#F7F8F5] text-black border-transparent hover:border-brand/30 hover:bg-[#F0F4EC]"
              )}
            >
              {/* Left: pack info */}
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base flex items-center gap-2">
                  {bundle.name}
                  {bundle.popular && (
                    <span
                      className={cn(
                        "text-[10px] font-bold py-0.5 px-2 rounded-full tracking-wide",
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-brand text-white"
                      )}
                    >
                      MÁS POPULAR
                    </span>
                  )}
                </span>

                {/* Price row */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-extrabold text-base sm:text-lg">
                    {bundle.price}
                  </span>
                  {bundle.id > 1 && (
                    <span
                      className={cn(
                        "text-xs line-through",
                        isSelected ? "text-white/60" : "text-black/40"
                      )}
                    >
                      {unitTotal}€
                    </span>
                  )}
                </div>

                {/* Savings */}
                {savings > 0 && (
                  <span
                    className={cn(
                      "text-xs font-semibold mt-0.5",
                      isSelected ? "text-white/90" : "text-brand"
                    )}
                  >
                    Ahorras {savings.toFixed(2).replace(".", ",")}€
                    {discountPct > 0 && ` (${discountPct}% dto.)`}
                  </span>
                )}
                {savings === 0 && (
                  <span
                    className={cn(
                      "text-xs mt-0.5",
                      isSelected ? "text-white/70" : "text-black/40"
                    )}
                  >
                    Precio base
                  </span>
                )}
              </div>

              {/* Right: radio circle */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3",
                  isSelected
                    ? "border-white bg-white"
                    : "border-black/20"
                )}
              >
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BundleSelection;
