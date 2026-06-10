"use client";

// Cambio: se eliminaron CartCounter y AddToCartBtn.
// El botón de pago ocupa todo el ancho, sin contador de cantidad.
import React from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/types/product.types";
import PaymentIcons from "@/components/common/PaymentIcons";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import { getStoredBundle } from "@/components/checkout/OrderSummary";

// La prop data se mantiene para no romper la firma que usa Header/index.tsx
const AddToCardSection = ({ data }: { data: Product }) => {
  const router = useRouter();
  const { trackInitiateCheckout } = useMetaPixel();

  const handleCheckout = (path: string) => {
    const bundle = getStoredBundle();
    trackInitiateCheckout({
      value: bundle.priceInCents / 100,
      currency: 'EUR',
      items: [
        {
          id: data.id,
          name: `${data.title} — ${bundle.name}`,
          quantity: 1,
          price: bundle.priceInCents / 100,
        },
      ],
    });
    router.push(path);
  };

  return (
    <div className="fixed md:relative w-full bg-white border-t md:border-none border-black/5 bottom-0 left-0 p-4 md:p-0 z-10 flex flex-col gap-2.5">
      {/* Botón principal — Pagar Al Recibir */}
      <button
        type="button"
        data-track-action="buy_now"
        className="bg-[#487D26] w-full rounded-full h-11 md:h-[52px] text-sm sm:text-base text-white hover:bg-[#3a6620] transition-all font-bold shadow-[0_4px_14px_rgba(72,125,38,0.3)]"
        onClick={() => handleCheckout("/checkout/cod")}
      >
        Pagar Al Recibir
      </button>

      {/* Botón secundario — Pagar con tarjeta */}
      <button
        type="button"
        data-track-action="buy_now"
        className="w-full rounded-full h-11 md:h-[52px] text-sm sm:text-base font-medium border-2 border-[#487D26] bg-white text-[#487D26] hover:bg-[#F0F4EC] transition-all flex items-center justify-center gap-2"
        onClick={() => handleCheckout("/checkout/card")}
      >
        <span>Pagar con tarjeta</span>
        <span className="bg-[#487D26] text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-tight">
          5€ dto.
        </span>
      </button>

      <PaymentIcons className="pt-1" />
    </div>
  );
};

export default AddToCardSection;
