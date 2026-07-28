"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredBundle, type Bundle } from "@/components/checkout/OrderSummary";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import dynamic from "next/dynamic";
import type { CheckoutActionsProps } from "./types";

// Lazy-load: mismo patrón que StickySmartCart — el chunk de CheckoutModal
// (Stripe.js, react-hook-form) no se descarga hasta que el usuario pulsa
// "Pagar con Tarjeta".
const CheckoutModal = dynamic(
  () => import("@/components/checkout/CheckoutModal"),
  { ssr: false }
);

const CheckoutActions: React.FC<CheckoutActionsProps> = ({ data }) => {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const { trackAddToCart, trackInitiateCheckout } = useMetaPixel();
  // MobileBottomNavigation (72px, z-50) vive en bottom-0 y se oculta al bajar;
  // esta barra lee la misma señal de scroll para apilarse encima cuando el nav
  // es visible y bajar a bottom-0 cuando se esconde — sin solaparse nunca.
  const scrollDir = useScrollDirection();
  const navVisible = scrollDir !== "down";

  // Siempre el pack DEL PRODUCTO DE ESTA FICHA. Antes se leía una selección
  // global, así que comprar desde la ficha de un producto podía cobrar el pack
  // de otro.
  useEffect(() => {
    setBundle(getStoredBundle(data.slug));
  }, [data.slug]);

  // Sync bundle when localStorage changes
  useEffect(() => {
    const interval = setInterval(() => {
      const b = getStoredBundle(data.slug);
      setBundle((prev) => (prev?.sku !== b?.sku ? b : prev));
    }, 500);
    return () => clearInterval(interval);
  }, [data.slug]);

  const openModal = () => {
    const b = getStoredBundle(data.slug);
    if (!b) return;
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
      <div
        className={cn(
          "md:hidden fixed left-0 right-0 bg-white border-t border-black/5 p-4 z-40 flex flex-col gap-2.5 transition-[bottom] duration-300",
          navVisible ? "bottom-[72px]" : "bottom-0"
        )}
      >
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
          productSlug={data.slug}
        />
      )}
    </>
  );
};

export default CheckoutActions;
