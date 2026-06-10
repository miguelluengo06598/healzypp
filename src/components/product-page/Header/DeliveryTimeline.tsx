"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  CheckCircle2,
  Package,
  Truck,
  Home,
  Clock,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONFIG & TYPES                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

type StepStatus = "completed" | "active" | "future";

interface TimelineStep {
  id: number;
  label: string;
  shortLabel: string;
  hours: string;
  icon: React.ElementType;
  status: StepStatus;
  tooltip: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DATE HELPERS                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

function getDeliveryEstimate(): {
  deliveryDate: Date;
  deliveryDays: number;
  formattedDate: string;
  relativeText: string;
} {
  const now = new Date();

  /* Deterministic 2-3 day window based on day of month */
  const seed = now.getDate();
  const deliveryDays = 2 + (seed % 2);

  const deliveryDate = new Date(now);
  deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
  deliveryDate.setHours(10 + (seed % 6), 0, 0, 0); // Between 10-16h

  const dayName = deliveryDate.toLocaleDateString("es-ES", {
    weekday: "long",
  });
  const dayNum = deliveryDate.getDate();
  const month = deliveryDate.toLocaleDateString("es-ES", { month: "long" });

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isTomorrow = deliveryDate.toDateString() === tomorrow.toDateString();
  const diffDays = Math.ceil(
    (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let relativeText = "";
  if (isTomorrow) relativeText = " (mañana)";
  else if (diffDays === 2) relativeText = " (pasado mañana)";
  else if (diffDays > 2) relativeText = ` (en ${diffDays} días)`;

  return {
    deliveryDate,
    deliveryDays,
    formattedDate: `${dayName} ${dayNum} de ${month}`,
    relativeText,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ANIMATION VARIANTS                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

const trackVariants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: CompactStep                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const CompactStep: React.FC<{
  step: TimelineStep;
  isLast: boolean;
}> = ({ step, isLast }) => {
  const Icon = step.icon;
  const isCompleted = step.status === "completed";
  const isActive = step.status === "active";

  return (
    <div className="flex items-center flex-1 group/step">
      <div className="flex flex-col items-center w-full relative">
        {/* Tooltip (desktop only) */}
        <div
          className={cn(
            "absolute -top-10 left-1/2 -translate-x-1/2",
            "px-2.5 py-1 rounded-lg bg-black text-white text-[10px] font-medium whitespace-nowrap",
            "opacity-0 group-hover/step:opacity-100 transition-opacity duration-200 pointer-events-none",
            "shadow-lg z-10 hidden sm:block"
          )}
        >
          {step.tooltip}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
        </div>

        {/* Dot / Icon */}
        <div className="relative">
          {isActive && (
            <motion.span
              className="absolute inset-0 rounded-full bg-amber-400/30"
              animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeOut",
              }}
            />
          )}
          <motion.div
            variants={itemVariants}
            className={cn(
              "relative w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 transition-colors duration-500",
              isCompleted &&
                "bg-emerald-500 border-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.35)]",
              isActive &&
                "bg-amber-500 border-amber-500 shadow-[0_2px_6px_rgba(245,158,11,0.4)]",
              !isCompleted && !isActive && "bg-white border-gray-300"
            )}
          >
            <Icon
              className={cn(
                "w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors duration-500",
                (isCompleted || isActive) && "text-white",
                !isCompleted && !isActive && "text-gray-400"
              )}
              strokeWidth={2.5}
            />
          </motion.div>
        </div>

        {/* Label */}
        <motion.span
          variants={itemVariants}
          className={cn(
            "text-[9px] sm:text-[10px] font-bold mt-1 transition-colors duration-500 uppercase tracking-wide",
            isCompleted && "text-emerald-600",
            isActive && "text-amber-600",
            !isCompleted && !isActive && "text-gray-400"
          )}
        >
          {step.shortLabel}
        </motion.span>

        {/* Hours */}
        <motion.span
          variants={itemVariants}
          className={cn(
            "text-[9px] font-medium transition-colors duration-500",
            isCompleted && "text-emerald-500/70",
            isActive && "text-amber-500/70",
            !isCompleted && !isActive && "text-gray-300"
          )}
        >
          {step.hours}
        </motion.span>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="relative flex-1 h-[2px] mx-1 sm:mx-1.5 mt-[-14px]">
          {/* Background track */}
          <div className="absolute inset-0 bg-gray-200 rounded-full" />
          {/* Animated filled track */}
          <motion.div
            variants={trackVariants}
            className={cn(
              "absolute inset-0 rounded-full",
              isCompleted
                ? "bg-emerald-400"
                : isActive
                ? "bg-gradient-to-r from-emerald-400 to-amber-400"
                : "bg-gray-200"
            )}
          />
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function DeliveryTimeline() {
  const { formattedDate, relativeText, deliveryDays } =
    useMemo(getDeliveryEstimate, []);

  const steps: TimelineStep[] = useMemo(
    () => [
      {
        id: 0,
        label: "Confirmado",
        shortLabel: "Conf",
        hours: "0h",
        icon: CheckCircle2,
        status: "completed",
        tooltip: "Confirmado al momento de la compra",
      },
      {
        id: 1,
        label: "Preparado",
        shortLabel: "Prep",
        hours: "24h",
        icon: Package,
        status: "completed",
        tooltip: "Se empieza a preparar tu pedido",
      },
      {
        id: 2,
        label: "Enviado",
        shortLabel: "Env",
        hours: "48h",
        icon: Truck,
        status: "active",
        tooltip: "Sale hacia tu domicilio",
      },
      {
        id: 3,
        label: "Entregado",
        shortLabel: "Ent",
        hours: "72h",
        icon: Home,
        status: "future",
        tooltip: "Llega a tu puerta",
      },
    ],
    []
  );

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28, delay: 0.15 }}
    >
      {/* ── Header: delivery info ── */}
      <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#F7F8F5] border-b border-black/5">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
        </motion.div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold text-black leading-tight">
            Si compras hoy, recibirás el{" "}
            <span className="text-brand font-bold">
              {formattedDate}
              {relativeText}
            </span>
          </p>
        </div>
      </div>

      {/* ── Compact timeline ── */}
      <motion.div
        className="px-3 sm:px-4 py-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-start">
          {steps.map((step, i) => (
            <CompactStep
              key={step.id}
              step={step}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>

        {/* Bottom meta row */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between mt-2 pt-2 border-t border-black/5"
        >
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3 text-black/30" />
            <span className="text-[10px] text-black/40 font-medium">
              Entrega en {deliveryDays}-{deliveryDays + 1} días hábiles
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-black/30" />
            <span className="text-[10px] text-black/40 font-medium">
              48-72h
            </span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
