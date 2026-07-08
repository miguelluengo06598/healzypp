"use client";

import React from "react";
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedPurchaseBadgeProps {
  className?: string;
  text?: string;
  pulse?: boolean;
}

const VerifiedPurchaseBadge: React.FC<VerifiedPurchaseBadgeProps> = ({
  className,
  text = "Compra verificada",
  pulse = true,
}) => {
  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold text-brand",
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
    >
      <motion.span
        animate={pulse ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <BadgeCheck className="w-3.5 h-3.5 fill-brand text-white" />
      </motion.span>
      {text}
    </motion.span>
  );
};

export default VerifiedPurchaseBadge;
