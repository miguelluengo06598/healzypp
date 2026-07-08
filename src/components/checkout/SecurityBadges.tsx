"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Server, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityBadgeItem {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}

const BADGES: SecurityBadgeItem[] = [
  {
    icon: Lock,
    label: "SSL 256-bit",
    description: "Conexión cifrada de extremo a extremo",
    color: "text-blue-600",
  },
  {
    icon: ShieldCheck,
    label: "RGPD",
    description: "Cumplimiento europeo de protección de datos",
    color: "text-brand",
  },
  {
    icon: Server,
    label: "Checkout seguro",
    description: "Procesado por servidores certificados PCI DSS",
    color: "text-amber-600",
  },
  {
    icon: EyeOff,
    label: "Privacidad",
    description: "Tus datos nunca se comparten con terceros",
    color: "text-slate-600",
  },
];

interface SecurityBadgesProps {
  className?: string;
}

const SecurityBadges: React.FC<SecurityBadgesProps> = ({ className = "" }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className={cn("flex flex-wrap justify-center gap-2 sm:gap-3", className)}>
      {BADGES.map((b) => {
        const Icon = b.icon;
        const isHovered = hovered === b.label;

        return (
          <motion.div
            key={b.label}
            onMouseEnter={() => setHovered(b.label)}
            onMouseLeave={() => setHovered(null)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className={cn(
              "relative flex items-center gap-1.5",
              "px-3 py-1.5 rounded-full border",
              "bg-white/60 backdrop-blur-sm",
              "transition-colors duration-200",
              isHovered ? "border-black/20 bg-white" : "border-black/10"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", b.color)} />
            <span className="text-[11px] font-medium text-black/70 whitespace-nowrap">
              {b.label}
            </span>

            {/* Tooltip */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-3 py-1.5 rounded-lg bg-black text-white text-[10px] font-medium shadow-lg z-10"
              >
                {b.description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default SecurityBadges;
