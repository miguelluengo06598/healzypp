"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/types/product.types";
import { getStoredBundle, type Bundle } from "@/components/checkout/OrderSummary";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import dynamic from "next/dynamic";

// Lazy-load: mismo patrón que StickySmartCart — el chunk de CheckoutModal
// (Stripe.js, react-hook-form) no se descarga hasta que el usuario pulsa
// "Pagar con Tarjeta".
const CheckoutModal = dynamic(
  () => import("@/components/checkout/CheckoutModal"),
  { ssr: false }
);

interface CheckoutActionsProps {
  data: Product;
}

const CheckoutActions: React.FC<CheckoutActionsProps> = ({ data }) => {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const { trackAddToCart, trackInitiateCheckout } = useMetaPixel();

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

  const openModal = () => {
    const b = getStoredBundle();
    setBundle(b);
    setModalMounted(true);
    setModalOpen(true);
    trackAddToCart({ id: data.id, name: data.title, price: b.priceInCents / 100 });
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
      {/* Desktop */}
      <div className="hidden md:flex flex-col gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={openModal}
          className="w-full rounded-full h-[52px] text-base font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-[0_4px_14px_rgba(72,125,38,0.3)] flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Pagar con Tarjeta
        </motion.button>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 p-4 z-40 flex flex-col gap-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={openModal}
          className="w-full rounded-full h-11 text-sm font-bold bg-brand hover:bg-brand-hover text-white transition-all shadow-[0_4px_14px_rgba(72,125,38,0.3)] flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Pagar con Tarjeta
        </motion.button>
      </div>

      {/* Modal — montado solo tras el primer clic (ver comentario del dynamic) */}
      {modalMounted && (
        <CheckoutModal
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  );
};

export default CheckoutActions;
