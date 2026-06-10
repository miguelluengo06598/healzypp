"use client";

import React from "react";
import { motion } from "framer-motion";
import { RefreshCcw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ReturnPolicySummaryProps {
  className?: string;
  days?: number;
}

const ReturnPolicySummary: React.FC<ReturnPolicySummaryProps> = ({
  className,
  days = 30,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={cn(
        "bg-white border border-black/10 rounded-[16px] p-4 sm:p-5 flex items-center gap-4",
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-[#F0F4EC] flex items-center justify-center shrink-0">
        <RefreshCcw className="w-5 h-5 text-brand" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-black">
            Devolución gratuita en {days} días
          </p>
          <Badge
            variant="new"
            className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4 hidden sm:inline-flex"
          >
            Sin preguntas
          </Badge>
        </div>
        <p className="text-xs text-black/50">
          Si no estás satisfecho, te devolvemos el dinero.
        </p>
      </div>

      <Link
        href="/legal/terms"
        className="shrink-0 text-xs font-medium text-brand hover:underline flex items-center gap-0.5"
      >
        Ver política
        <ArrowRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
};

export default ReturnPolicySummary;
