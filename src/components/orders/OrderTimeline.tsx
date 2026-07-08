"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Package,
  Truck,
  Home,
  Clock,
  CalendarDays,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import {
  springConfigs,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations/microinteractions";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

export type TimelineStage = {
  id: number;
  name: string;
  icon: React.ElementType;
  hours: number;
  message: string;
  completedMessage: string;
};

export interface OrderTimelineProps {
  /** When the order was confirmed */
  orderConfirmedAt: Date | string;
  /** Hours until "Preparado" stage (default: 18) */
  preparationHours?: number;
  /** Hours until "Enviado" stage (default: 42) */
  shippingHours?: number;
  /** Hours until "Entregado" stage (default: 66) */
  deliveryHours?: number;
  /** Optional CSS class */
  className?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

const STAGE_CONFIG = {
  completed: {
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-600",
    textLight: "text-emerald-500",
    icon: "text-white",
    glow: "shadow-emerald-500/30",
    track: "bg-emerald-500",
  },
  current: {
    bg: "bg-amber-500",
    border: "border-amber-500",
    text: "text-amber-700",
    textLight: "text-amber-500",
    icon: "text-white",
    glow: "shadow-amber-500/40",
    track: "bg-amber-500",
  },
  future: {
    bg: "bg-gray-200",
    border: "border-gray-300",
    text: "text-gray-500",
    textLight: "text-gray-400",
    icon: "text-gray-400",
    glow: "",
    track: "bg-gray-200",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HOOK: useCountdown                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

function useCountdown(targetDate: Date, active: boolean): string {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, targetDate.getTime() - Date.now())
  );

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      const ms = Math.max(0, targetDate.getTime() - Date.now());
      setRemaining(ms);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate, active]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HOOK: useOrderProgress                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function useOrderProgress(
  orderConfirmedAt: Date,
  prepH: number,
  shipH: number,
  delH: number
) {
  const [now, setNow] = useState(() => new Date());

  /* Recalculate every minute */
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const hoursPassed = useMemo(() => {
    return (now.getTime() - orderConfirmedAt.getTime()) / (1000 * 60 * 60);
  }, [now, orderConfirmedAt]);

  const stages: TimelineStage[] = useMemo(
    () => [
      {
        id: 0,
        name: "Confirmado",
        icon: CheckCircle2,
        hours: 0,
        message: "Tu pedido ha sido confirmado",
        completedMessage: "Pedido confirmado",
      },
      {
        id: 1,
        name: "Preparado",
        icon: Package,
        hours: prepH,
        message: "Tu pedido se está preparando",
        completedMessage: "Pedido preparado",
      },
      {
        id: 2,
        name: "Enviado",
        icon: Truck,
        hours: shipH,
        message: "Tu pedido está de camino",
        completedMessage: "Pedido enviado",
      },
      {
        id: 3,
        name: "Entregado",
        icon: Home,
        hours: delH,
        message: "Tu pedido ha llegado",
        completedMessage: "Pedido entregado",
      },
    ],
    [prepH, shipH, delH]
  );

  const currentStageIndex = useMemo(() => {
    for (let i = stages.length - 1; i >= 0; i--) {
      if (hoursPassed >= stages[i].hours) return i;
    }
    return 0;
  }, [hoursPassed, stages]);

  const nextStage = stages[currentStageIndex + 1];
  const isDelivered = currentStageIndex === stages.length - 1;

  /* Delivery estimate date */
  const deliveryDate = useMemo(() => {
    const d = new Date(orderConfirmedAt);
    d.setHours(d.getHours() + delH);
    return d;
  }, [orderConfirmedAt, delH]);

  /* Progress percentage (0-100) */
  const progressPercent = useMemo(() => {
    if (isDelivered) return 100;
    const prev = stages[currentStageIndex];
    const next = stages[currentStageIndex + 1];
    if (!next) return 100;
    const stageDuration = next.hours - prev.hours;
    const elapsedInStage = hoursPassed - prev.hours;
    const stageProgress = Math.min(1, Math.max(0, elapsedInStage / stageDuration));
    const base = (currentStageIndex / (stages.length - 1)) * 100;
    const increment = (1 / (stages.length - 1)) * stageProgress * 100;
    return Math.round(base + increment);
  }, [hoursPassed, currentStageIndex, stages, isDelivered]);

  return {
    stages,
    currentStageIndex,
    nextStage,
    isDelivered,
    hoursPassed,
    deliveryDate,
    progressPercent,
    now,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HELPERS                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function formatDeliveryDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const dayName = date.toLocaleDateString("es-ES", { weekday: "long" });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("es-ES", { month: "long" });

  let relative = "";
  if (isToday) relative = " (hoy)";
  else if (isTomorrow) relative = " (mañana)";
  else {
    const diff = Math.ceil(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff > 1) relative = ` (en ${diff} días)`;
  }

  return `${dayName} ${dayNum} de ${month}${relative}`;
}

function stageStatus(
  stageIdx: number,
  currentIdx: number
): "completed" | "current" | "future" {
  if (stageIdx < currentIdx) return "completed";
  if (stageIdx === currentIdx) return "current";
  return "future";
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: CountdownBadge                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

const CountdownBadge: React.FC<{
  targetDate: Date;
  active: boolean;
  urgent?: boolean;
}> = ({ targetDate, active, urgent }) => {
  const countdown = useCountdown(targetDate, active);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={countdown}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
          urgent
            ? "bg-red-50 text-red-600 border border-red-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        )}
      >
        <Clock className="w-3 h-3" />
        Llega en {countdown}
      </motion.span>
    </AnimatePresence>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: StageIcon                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const StageIcon: React.FC<{
  status: "completed" | "current" | "future";
  icon: React.ElementType;
  isLast?: boolean;
}> = ({ status, icon: Icon, isLast }) => {
  const styles = STAGE_CONFIG[status];

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse ring for current */}
      {status === "current" && (
        <motion.span
          className={cn(
            "absolute inset-0 rounded-full",
            styles.bg,
            "opacity-30"
          )}
          animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeOut",
          }}
        />
      )}

      <motion.div
        initial={false}
        animate={
          status === "current"
            ? { scale: [1, 1.08, 1] }
            : { scale: 1 }
        }
        transition={
          status === "current"
            ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
            : undefined
        }
        className={cn(
          "relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 transition-colors duration-500",
          status === "completed" && `${styles.bg} ${styles.border} ${styles.glow} shadow-lg`,
          status === "current" && `${styles.bg} ${styles.border} ${styles.glow} shadow-lg`,
          status === "future" && `${styles.bg} ${styles.border}`
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-500",
            styles.icon
          )}
          strokeWidth={2.5}
        />
      </motion.div>

      {/* Small checkmark overlay for completed */}
      {status === "completed" && !isLast && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.2 }}
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-emerald-500"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        </motion.div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: HorizontalTimeline                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

const HorizontalTimeline: React.FC<{
  stages: TimelineStage[];
  currentStageIndex: number;
  hoursPassed: number;
  nextStage: TimelineStage | undefined;
  isDelivered: boolean;
  deliveryDate: Date;
}> = ({
  stages,
  currentStageIndex,
  hoursPassed,
  nextStage,
  isDelivered,
  deliveryDate,
}) => {
  const currentStage = stages[currentStageIndex];

  return (
    <div className="hidden md:block">
      {/* Timeline track */}
      <div className="relative mb-8">
        {/* Background track */}
        <div className="absolute top-5 sm:top-[22px] left-0 right-0 h-[3px] bg-gray-200 rounded-full" />

        {/* Animated progress track */}
        <motion.div
          className="absolute top-5 sm:top-[22px] left-0 h-[3px] rounded-full"
          style={{
            background: "linear-gradient(90deg, #10B981, #F59E0B)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />

        {/* Stages */}
        <div className="relative flex justify-between">
          {stages.map((stage, idx) => {
            const status = stageStatus(idx, currentStageIndex);
            const isLast = idx === stages.length - 1;

            return (
              <motion.div
                key={stage.id}
                variants={staggerItemVariants}
                className="flex flex-col items-center gap-2"
                style={{ width: isLast ? "auto" : undefined }}
              >
                <StageIcon status={status} icon={stage.icon} isLast={isLast} />

                <div className="text-center space-y-0.5 mt-1">
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-bold transition-colors duration-500",
                      status === "completed" && STAGE_CONFIG.completed.text,
                      status === "current" && STAGE_CONFIG.current.text,
                      status === "future" && STAGE_CONFIG.future.text
                    )}
                  >
                    {stage.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-black/40 font-medium">
                    {status === "completed"
                      ? `${stage.hours}h · Completado`
                      : status === "current"
                      ? `${stage.hours}h · En curso`
                      : `${stage.hours}h · Pendiente`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Contextual info */}
      <motion.div
        variants={staggerItemVariants}
        className="bg-[#F7F8F5] rounded-2xl border border-black/5 p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-black">
                {isDelivered
                  ? "¡Pedido entregado!"
                  : `Etapa actual: ${currentStage.name}`}
              </span>
            </div>
            <p className="text-sm text-black/60">
              {isDelivered
                ? currentStage.message
                : currentStage.message}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <CalendarDays className="w-3.5 h-3.5 text-black/40" />
              <span className="text-xs text-black/50">
                Entrega estimada: {formatDeliveryDate(deliveryDate)}
              </span>
            </div>
          </div>

          {!isDelivered && nextStage && (
            <div className="shrink-0">
              <CountdownBadge
                targetDate={new Date(
                  Date.now() +
                    (nextStage.hours - hoursPassed) * 60 * 60 * 1000
                )}
                active={true}
                urgent={nextStage.hours - hoursPassed < 24}
              />
            </div>
          )}

          {isDelivered && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: VerticalTimeline                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

const VerticalTimeline: React.FC<{
  stages: TimelineStage[];
  currentStageIndex: number;
  hoursPassed: number;
  nextStage: TimelineStage | undefined;
  isDelivered: boolean;
  deliveryDate: Date;
}> = ({
  stages,
  currentStageIndex,
  hoursPassed,
  nextStage,
  isDelivered,
  deliveryDate,
}) => {
  const currentStage = stages[currentStageIndex];

  return (
    <div className="md:hidden">
      <div className="relative pl-2">
        {/* Vertical track line */}
        <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-gray-200 rounded-full" />

        {/* Animated progress line */}
        <motion.div
          className="absolute left-[23px] top-4 w-[2px] rounded-full"
          style={{
            background: "linear-gradient(180deg, #10B981, #F59E0B)",
          }}
          initial={{ height: "0%" }}
          animate={{
            height: `${(currentStageIndex / (stages.length - 1)) * 100}%`,
          }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />

        <div className="space-y-5">
          {stages.map((stage, idx) => {
            const status = stageStatus(idx, currentStageIndex);
            const isLast = idx === stages.length - 1;

            return (
              <motion.div
                key={stage.id}
                variants={staggerItemVariants}
                className="relative flex items-start gap-3"
              >
                <StageIcon status={status} icon={stage.icon} isLast={isLast} />

                <div className="pt-1 space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-bold transition-colors duration-500",
                        status === "completed" && STAGE_CONFIG.completed.text,
                        status === "current" && STAGE_CONFIG.current.text,
                        status === "future" && STAGE_CONFIG.future.text
                      )}
                    >
                      {stage.name}
                    </p>
                    {status === "current" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                        AHORA
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-black/50">
                    {status === "completed"
                      ? `${stage.hours}h · ${stage.completedMessage}`
                      : status === "current"
                      ? `${stage.hours}h · En curso`
                      : `${stage.hours}h · Pendiente`}
                  </p>

                  {status === "current" && !isDelivered && nextStage && (
                    <div className="pt-1">
                      <CountdownBadge
                        targetDate={new Date(
                          Date.now() +
                            (nextStage.hours - hoursPassed) * 60 * 60 * 1000
                        )}
                        active={true}
                        urgent={nextStage.hours - hoursPassed < 24}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Contextual info card */}
      <motion.div
        variants={staggerItemVariants}
        className="mt-6 bg-[#F7F8F5] rounded-2xl border border-black/5 p-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="text-sm font-bold text-black">
            {isDelivered
              ? "¡Pedido entregado!"
              : `Etapa actual: ${currentStage.name}`}
          </span>
        </div>
        <p className="text-sm text-black/60 mb-2">
          {currentStage.message}
        </p>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-black/40" />
          <span className="text-xs text-black/50">
            Entrega estimada: {formatDeliveryDate(deliveryDate)}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

const OrderTimeline: React.FC<OrderTimelineProps> = ({
  orderConfirmedAt,
  preparationHours = 18,
  shippingHours = 42,
  deliveryHours = 66,
  className,
}) => {
  const confirmedDate = useMemo(
    () =>
      typeof orderConfirmedAt === "string"
        ? new Date(orderConfirmedAt)
        : orderConfirmedAt,
    [orderConfirmedAt]
  );

  const {
    stages,
    currentStageIndex,
    nextStage,
    isDelivered,
    hoursPassed,
    deliveryDate,
    progressPercent,
  } = useOrderProgress(
    confirmedDate,
    preparationHours,
    shippingHours,
    deliveryHours
  );

  const currentStage = stages[currentStageIndex];

  /* Live progress bar for top banner */
  const bannerColor = isDelivered
    ? "bg-emerald-500"
    : "bg-gradient-to-r from-emerald-500 to-amber-500";

  return (
    <motion.div
      className={cn(
        "w-full bg-white rounded-[20px] sm:rounded-[24px] border border-black/10 shadow-sm overflow-hidden",
        className
      )}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfigs.soft}
    >
      {/* ── Top banner with animated progress ── */}
      <div className="relative overflow-hidden">
        <div className="bg-[#F7F8F5] px-5 sm:px-6 py-4 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <motion.h3
                className={cn(
                  integralCF.className,
                  "text-lg sm:text-xl text-black leading-tight"
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, ...springConfigs.soft }}
              >
                {isDelivered
                  ? "¡Pedido entregado!"
                  : "Tu pedido está de camino"}
              </motion.h3>
              <motion.p
                className="text-sm text-black/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, ...springConfigs.soft }}
              >
                Entrega estimada:{" "}
                <span className="font-semibold text-black/70">
                  {formatDeliveryDate(deliveryDate)}
                </span>
              </motion.p>
            </div>

            {!isDelivered && (
              <motion.div
                className="shrink-0"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, ...springConfigs.bouncy }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                </div>
              </motion.div>
            )}

            {isDelivered && (
              <motion.div
                className="shrink-0"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, ...springConfigs.bouncy }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Home className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className={cn("h-full rounded-r-full", bannerColor)}
            initial={{ width: "0%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <motion.div
        className="p-5 sm:p-6"
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Horizontal timeline (desktop) */}
        <HorizontalTimeline
          stages={stages}
          currentStageIndex={currentStageIndex}
          hoursPassed={hoursPassed}
          nextStage={nextStage}
          isDelivered={isDelivered}
          deliveryDate={deliveryDate}
        />

        {/* Vertical timeline (mobile) */}
        <VerticalTimeline
          stages={stages}
          currentStageIndex={currentStageIndex}
          hoursPassed={hoursPassed}
          nextStage={nextStage}
          isDelivered={isDelivered}
          deliveryDate={deliveryDate}
        />

        {/* ── Footer status ── */}
        <motion.div
          variants={staggerItemVariants}
          className="mt-5 pt-4 border-t border-black/5 flex items-center gap-2 text-xs text-black/40"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isDelivered
              ? "Entregado correctamente. ¿Necesitas ayuda? Contacta con nosotros."
              : `El tiempo de entrega es estimado. Última actualización: ${new Date().toLocaleTimeString(
                  "es-ES",
                  { hour: "2-digit", minute: "2-digit" }
                )}`}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default OrderTimeline;
