"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

const ICONS = [
  { src: "/icons/Visa.svg", alt: "Visa", w: 38 },
  { src: "/icons/mastercard.svg", alt: "Mastercard", w: 30 },
  { src: "/icons/paypal.svg", alt: "PayPal", w: 56 },
  { src: "/icons/applePay.svg", alt: "Apple Pay", w: 40 },
  { src: "/icons/googlePay.svg", alt: "Google Pay", w: 46 },
  { src: "/icons/american-express.svg", alt: "American Express", w: 34 },
];

interface PaymentIconsProps {
  className?: string;
}

/**
 * Row of payment method logos with subtle hover scale.
 * Place below any CTA to add trust signals.
 */
const PaymentIcons: React.FC<PaymentIconsProps> = ({ className = "" }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 sm:gap-4 flex-wrap",
        className
      )}
    >
      {ICONS.map(({ src, alt, w }) => (
        <motion.div
          key={alt}
          whileHover={{ scale: 1.12 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="relative opacity-60 hover:opacity-100 transition-opacity"
        >
          <Image
            src={src}
            alt={alt}
            width={0}
            height={20}
            className="object-contain"
            style={{ height: 20, width: "auto" }}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default PaymentIcons;
