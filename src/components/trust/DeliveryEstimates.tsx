"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, Package, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryEstimatesProps {
  className?: string;
  freeThreshold?: number;
  cartTotal?: number;
}

const DeliveryEstimates: React.FC<DeliveryEstimatesProps> = ({
  className,
  freeThreshold = 50,
  cartTotal = 0,
}) => {
  const { estimate, isFree } = useMemo(() => {
    const today = new Date();
    const minDays = 2;
    const maxDays = 5;
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDays);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    const fmt = (d: Date) =>
      d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

    return {
      estimate: `${fmt(minDate)} – ${fmt(maxDate)}`,
      isFree: cartTotal >= freeThreshold,
    };
  }, [cartTotal, freeThreshold]);

  const remaining = Math.max(freeThreshold - cartTotal, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={cn(
        "bg-[#F7F8F5] rounded-[16px] p-4 sm:p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black">Entrega estimada</p>
          <p className="text-sm text-black/60 capitalize">{estimate}</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black">
            {isFree ? "Envío gratis" : `Envío: €4.99`}
          </p>
          {!isFree && remaining > 0 && (
            <p className="text-xs text-black/50">
              Te faltan €{remaining.toFixed(0)} para envío gratis
            </p>
          )}
          {isFree && (
            <p className="text-xs text-brand font-medium">
              ¡Has desbloqueado envío gratis!
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black">Envío a España</p>
          <p className="text-xs text-black/50">Península e Islas Baleares</p>
        </div>
      </div>
    </motion.div>
  );
};

export default DeliveryEstimates;
