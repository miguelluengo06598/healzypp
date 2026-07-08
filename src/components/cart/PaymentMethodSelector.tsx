"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Wallet, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/redux";
import { setPaymentMethod } from "@/lib/features/carts/cartsSlice";
import { RootState } from "@/lib/store";

const CARD_DISCOUNT_EUR = 5;
const MIN_FOR_DISCOUNT = 20;

interface PaymentMethodSelectorProps {
  onConfirm: (method: "card" | "cod") => void;
  onCancel: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  onConfirm,
  onCancel,
}) => {
  const dispatch = useAppDispatch();
  const { adjustedTotalPrice } = useAppSelector((state: RootState) => state.carts);
  const [selected, setSelected] = useState<"card" | "cod" | null>(null);

  const hasDiscount = adjustedTotalPrice > MIN_FOR_DISCOUNT;

  const handleConfirm = () => {
    if (!selected) return;
    dispatch(setPaymentMethod({ method: selected, totalEur: adjustedTotalPrice }));
    onConfirm(selected);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="space-y-3"
    >
      <p className="text-sm font-semibold text-black">¿Cómo quieres pagar?</p>

      {/* Tarjeta */}
      <button
        type="button"
        onClick={() => setSelected("card")}
        className={cn(
          "w-full rounded-xl border-2 p-4 text-left transition-all",
          selected === "card"
            ? "border-brand bg-[#F0F4EC]"
            : "border-black/10 bg-white hover:border-black/20"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                selected === "card"
                  ? "bg-brand text-white"
                  : "bg-black/5 text-black/60"
              )}
            >
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black leading-tight">
                Tarjeta de crédito/débito
              </p>
              <p className="text-xs text-black/50 mt-0.5">
                Visa, Mastercard, Amex · Pago inmediato
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasDiscount && (
              <span className="text-[11px] font-bold text-white bg-brand px-2 py-0.5 rounded-full leading-tight whitespace-nowrap">
                −{CARD_DISCOUNT_EUR}€
              </span>
            )}
            {selected === "card" && <Check className="w-4 h-4 text-brand" />}
          </div>
        </div>
        {hasDiscount && (
          <p className="text-[11px] text-brand font-medium mt-2 ml-12">
            Ahorra {CARD_DISCOUNT_EUR}€ pagando con tarjeta
          </p>
        )}
      </button>

      {/* Contra reembolso */}
      <button
        type="button"
        onClick={() => setSelected("cod")}
        className={cn(
          "w-full rounded-xl border-2 p-4 text-left transition-all",
          selected === "cod"
            ? "border-amber-400 bg-amber-50"
            : "border-black/10 bg-white hover:border-black/20"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                selected === "cod"
                  ? "bg-amber-500 text-white"
                  : "bg-black/5 text-black/60"
              )}
            >
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black leading-tight">
                Contra reembolso
              </p>
              <p className="text-xs text-black/50 mt-0.5">
                Paga al recibir el pedido · Efectivo o tarjeta
              </p>
            </div>
          </div>
          {selected === "cod" && (
            <Check className="w-4 h-4 text-amber-500 shrink-0" />
          )}
        </div>
      </button>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-full border border-black/15 text-sm font-medium text-black/60 hover:bg-black/5 transition-colors"
        >
          Volver
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={handleConfirm}
          className={cn(
            "flex-[2] h-11 rounded-full text-sm font-bold transition-all",
            selected
              ? "bg-brand text-white shadow-[0_4px_14px_rgba(72,125,38,0.3)] hover:bg-brand-hover"
              : "bg-black/10 text-black/30 cursor-not-allowed"
          )}
        >
          Continuar
        </button>
      </div>
    </motion.div>
  );
};

export default PaymentMethodSelector;
