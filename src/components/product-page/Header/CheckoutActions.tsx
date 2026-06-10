"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/types/product.types";
import { getStoredBundle, type Bundle } from "@/components/checkout/OrderSummary";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import CheckoutModal from "@/components/checkout/CheckoutModal";

interface CheckoutActionsProps {
  data: Product;
}

const CheckoutActions: React.FC<CheckoutActionsProps> = ({ data }) => {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMethod, setActiveMethod] = useState<"cod" | "card">("cod");
  const { trackInitiateCheckout } = useMetaPixel();

  useEffect(() => {
    setBundle(getStoredBundle());
  }, []);

  // Sync bundle when localStorage changes
  useEffect(() => {
    const interval = setInterval(() => {
      const b = getStoredBundle();
      setBundle((prev) => (prev?.id !== b.id ? b : prev));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const openModal = (method: "cod" | "card") => {
    const b = getStoredBundle();
    setBundle(b);
    setActiveMethod(method);
    setModalOpen(true);
    trackInitiateCheckout({
      value: b.priceInCents / 100,
      currency: "EUR",
      items: [
        {
          id: data.id,
          name: `${data.title} — ${b.name}`,
          quantity: 1,
          price: b.priceInCents / 100,
        },
      ],
    });
  };

  if (!bundle) return null;

  return (
    <>
      {/* Desktop: inline buttons */}
      <div className="hidden md:flex flex-col gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => openModal("cod")}
          className="w-full rounded-full h-[52px] text-base font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-[0_4px_14px_rgba(72,125,38,0.3)] flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          Pagar Al Recibir
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => openModal("card")}
          className="w-full rounded-full h-[52px] text-base font-medium border-2 border-[#487D26] bg-white text-[#487D26] hover:bg-[#F0F4EC] transition-all flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>Pagar con Tarjeta</span>
          <span className="bg-[#487D26] text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-tight">
            5€ dto.
          </span>
        </motion.button>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 p-4 z-40 flex flex-col gap-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => openModal("cod")}
          className="w-full rounded-full h-11 text-sm font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-[0_4px_14px_rgba(72,125,38,0.3)] flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          Pagar Al Recibir
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={() => openModal("card")}
          className="w-full rounded-full h-11 text-sm font-medium border-2 border-[#487D26] bg-white text-[#487D26] hover:bg-[#F0F4EC] transition-all flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>Pagar con Tarjeta</span>
          <span className="bg-[#487D26] text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
            5€ dto.
          </span>
        </motion.button>
      </div>

      {/* Modal */}
      <CheckoutModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        method={activeMethod}
      />
    </>
  );
};

export default CheckoutActions;
