"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Package,
  Truck,
  Home,
  CreditCard,
  AlertCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import {
  springConfigs,
  staggerContainerVariants,
  staggerItemVariants,
} from "./microinteractions";
import type { OrderStatusEnum } from "@/types/database.types";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                      */
/*                                                                             */
/*  Este componente se alimenta EXCLUSIVAMENTE de datos reales del pedido      */
/*  (orders.estado + filas de order_tracking). La versión anterior simulaba    */
/*  el progreso por horas transcurridas desde la confirmación — mostraba       */
/*  "Enviado"/"Entregado" sin que nada lo respaldara. Aquí una etapa solo      */
/*  se marca completada si hay una señal real; las demás quedan pendientes,    */
/*  sin fecha y sin promesa temporal.                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

export interface OrderTrackingEventInput {
  estado: OrderStatusEnum;
  descripcion: string | null;
  numero_tracking: string | null;
  empresa_envio: string | null;
  fecha_creacion: string;
}

export interface OrderTimelineProps {
  /** orders.estado real */
  estado: OrderStatusEnum;
  /** orders.fecha_creacion */
  confirmedAt: string;
  /** Fecha de pago si el pedido llegó a 'pagado' (orders.fecha_actualizacion) */
  paidAt?: string | null;
  /** Filas reales de order_tracking del pedido */
  trackingEvents?: OrderTrackingEventInput[];
  className?: string;
}

type StageStatus = "completed" | "current" | "future";

interface DerivedStage {
  id: number;
  name: string;
  icon: React.ElementType;
  status: StageStatus;
  /** Fecha real del hito; null si la etapa no tiene señal con fecha */
  date: string | null;
  numeroTracking?: string | null;
  empresaEnvio?: string | null;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

const STAGE_CONFIG = {
  completed: {
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-600",
    icon: "text-white",
    glow: "shadow-emerald-500/30",
  },
  current: {
    bg: "bg-amber-500",
    border: "border-amber-500",
    text: "text-amber-700",
    icon: "text-white",
    glow: "shadow-amber-500/40",
  },
  future: {
    bg: "bg-gray-200",
    border: "border-gray-300",
    text: "text-gray-500",
    icon: "text-gray-400",
    glow: "",
  },
};

/** Rango alcanzado en la escalera según orders.estado */
const ESTADO_RANK: Partial<Record<OrderStatusEnum, number>> = {
  pendiente: 0,
  pagado: 1,
  procesando: 1,
  enviado: 2,
  entregado: 3,
};

/** Estados fuera de la escalera: se muestra banner de estado, no progresión */
const TERMINAL_STATES: Partial<
  Record<OrderStatusEnum, { title: string; message: string; icon: React.ElementType; tone: "error" | "neutral" }>
> = {
  fallido: {
    title: "Pago fallido",
    message:
      "El pago de este pedido no se completó. Si crees que es un error, contacta con nosotros.",
    icon: XCircle,
    tone: "error",
  },
  cancelado: {
    title: "Pedido cancelado",
    message: "Este pedido fue cancelado.",
    icon: XCircle,
    tone: "neutral",
  },
  reembolsado: {
    title: "Pedido reembolsado",
    message: "El importe de este pedido ha sido reembolsado.",
    icon: RotateCcw,
    tone: "neutral",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DERIVATION — solo señales reales, nunca reloj                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function deriveStages(
  estado: OrderStatusEnum,
  confirmedAt: string,
  paidAt: string | null | undefined,
  events: OrderTrackingEventInput[]
): { stages: DerivedStage[]; completedRank: number } {
  const eventByEstado = (e: OrderStatusEnum) =>
    events.find((ev) => ev.estado === e);

  // Rango completado = máximo entre orders.estado y los eventos de tracking
  let completedRank = ESTADO_RANK[estado] ?? 0;
  for (const ev of events) {
    const r = ESTADO_RANK[ev.estado];
    if (r !== undefined && r > completedRank) completedRank = r;
  }

  const shippedEvent = eventByEstado("enviado");
  const deliveredEvent = eventByEstado("entregado");

  const defs: Array<Omit<DerivedStage, "status">> = [
    {
      id: 0,
      name: "Confirmado",
      icon: CheckCircle2,
      date: eventByEstado("pendiente")?.fecha_creacion ?? confirmedAt,
    },
    {
      id: 1,
      name: "Pagado",
      icon: CreditCard,
      date:
        eventByEstado("pagado")?.fecha_creacion ??
        (completedRank >= 1 ? paidAt ?? null : null),
    },
    {
      id: 2,
      name: "Enviado",
      icon: Truck,
      date: shippedEvent?.fecha_creacion ?? null,
      numeroTracking: shippedEvent?.numero_tracking,
      empresaEnvio: shippedEvent?.empresa_envio,
    },
    {
      id: 3,
      name: "Entregado",
      icon: Home,
      date: deliveredEvent?.fecha_creacion ?? null,
    },
  ];

  const stages: DerivedStage[] = defs.map((def) => ({
    ...def,
    status:
      def.id <= completedRank
        ? "completed"
        : def.id === completedRank + 1
        ? "current" // "siguiente paso" — sin fecha ni promesa temporal
        : "future",
  }));

  return { stages, completedRank };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bannerFor(estado: OrderStatusEnum, completedRank: number) {
  if (completedRank >= 3)
    return { title: "¡Pedido entregado!", icon: Home, iconTone: "emerald" as const };
  if (completedRank >= 2)
    return { title: "Tu pedido está de camino", icon: Truck, iconTone: "amber" as const };
  if (completedRank >= 1)
    return { title: "Pago confirmado", icon: CreditCard, iconTone: "emerald" as const };
  return {
    title: "Esperando confirmación de pago",
    icon: Package,
    iconTone: "amber" as const,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: StageIcon                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const StageIcon: React.FC<{
  status: StageStatus;
  icon: React.ElementType;
  isLast?: boolean;
}> = ({ status, icon: Icon, isLast }) => {
  const styles = STAGE_CONFIG[status];

  return (
    <div className="relative flex items-center justify-center">
      {status === "current" && (
        <motion.span
          className={cn("absolute inset-0 rounded-full", styles.bg, "opacity-30")}
          animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
        />
      )}

      <div
        className={cn(
          "relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 transition-colors duration-500",
          (status === "completed" || status === "current") &&
            `${styles.bg} ${styles.border} ${styles.glow} shadow-lg`,
          status === "future" && `${styles.bg} ${styles.border}`
        )}
      >
        <Icon
          className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-500", styles.icon)}
          strokeWidth={2.5}
        />
      </div>

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
/*  SUB-COMPONENT: sublabel por etapa (fecha real o estado pendiente)          */
/* ═══════════════════════════════════════════════════════════════════════════ */

function stageSublabel(stage: DerivedStage): string {
  if (stage.status === "completed")
    return stage.date ? formatDate(stage.date) : "Completado";
  if (stage.status === "current") return "Siguiente paso";
  return "Pendiente";
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: HorizontalTimeline (desktop)                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

const HorizontalTimeline: React.FC<{ stages: DerivedStage[]; completedRank: number }> = ({
  stages,
  completedRank,
}) => {
  return (
    <div className="hidden md:block">
      <div className="relative">
        <div className="absolute top-5 sm:top-[22px] left-0 right-0 h-[3px] bg-gray-200 rounded-full" />
        <motion.div
          className="absolute top-5 sm:top-[22px] left-0 h-[3px] rounded-full bg-emerald-500"
          initial={{ width: "0%" }}
          animate={{ width: `${(completedRank / (stages.length - 1)) * 100}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />

        <div className="relative flex justify-between">
          {stages.map((stage, idx) => (
            <motion.div
              key={stage.id}
              variants={staggerItemVariants}
              className="flex flex-col items-center gap-2"
            >
              <StageIcon
                status={stage.status}
                icon={stage.icon}
                isLast={idx === stages.length - 1}
              />
              <div className="text-center space-y-0.5 mt-1">
                <p
                  className={cn(
                    "text-xs sm:text-sm font-bold transition-colors duration-500",
                    STAGE_CONFIG[stage.status].text
                  )}
                >
                  {stage.name}
                </p>
                <p className="text-[10px] sm:text-xs text-black/40 font-medium">
                  {stageSublabel(stage)}
                </p>
                {stage.numeroTracking && (
                  <p className="text-[10px] text-black/40">
                    {stage.empresaEnvio ? `${stage.empresaEnvio} · ` : ""}
                    {stage.numeroTracking}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENT: VerticalTimeline (mobile)                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const VerticalTimeline: React.FC<{ stages: DerivedStage[]; completedRank: number }> = ({
  stages,
  completedRank,
}) => {
  return (
    <div className="md:hidden">
      <div className="relative pl-2">
        <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-gray-200 rounded-full" />
        <motion.div
          className="absolute left-[23px] top-4 w-[2px] rounded-full bg-emerald-500"
          initial={{ height: "0%" }}
          animate={{ height: `${(completedRank / (stages.length - 1)) * 100}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />

        <div className="space-y-5">
          {stages.map((stage, idx) => (
            <motion.div
              key={stage.id}
              variants={staggerItemVariants}
              className="relative flex items-start gap-3"
            >
              <StageIcon
                status={stage.status}
                icon={stage.icon}
                isLast={idx === stages.length - 1}
              />
              <div className="pt-1 space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm font-bold transition-colors duration-500",
                      STAGE_CONFIG[stage.status].text
                    )}
                  >
                    {stage.name}
                  </p>
                  {stage.status === "current" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                      SIGUIENTE
                    </span>
                  )}
                </div>
                <p className="text-xs text-black/50">{stageSublabel(stage)}</p>
                {stage.numeroTracking && (
                  <p className="text-xs text-black/40">
                    {stage.empresaEnvio ? `${stage.empresaEnvio} · ` : ""}
                    {stage.numeroTracking}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

const OrderTimeline: React.FC<OrderTimelineProps> = ({
  estado,
  confirmedAt,
  paidAt = null,
  trackingEvents = [],
  className,
}) => {
  const terminal = TERMINAL_STATES[estado];

  const { stages, completedRank } = useMemo(
    () => deriveStages(estado, confirmedAt, paidAt, trackingEvents),
    [estado, confirmedAt, paidAt, trackingEvents]
  );

  /* Fecha del último hito real (para "Última actualización") */
  const lastRealUpdate = useMemo(() => {
    const dates = stages
      .filter((s) => s.status === "completed" && s.date)
      .map((s) => s.date as string);
    if (dates.length === 0) return confirmedAt;
    return dates.sort().at(-1) as string;
  }, [stages, confirmedAt]);

  /* ── Estados terminales fuera de la escalera: banner, no progresión ── */
  if (terminal) {
    const TIcon = terminal.icon;
    return (
      <motion.div
        className={cn(
          "w-full rounded-[20px] border p-5 flex items-start gap-4",
          terminal.tone === "error"
            ? "bg-red-50 border-red-200"
            : "bg-gray-50 border-black/10",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfigs.soft}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            terminal.tone === "error" ? "bg-red-100" : "bg-gray-200"
          )}
        >
          <TIcon
            className={cn(
              "w-5 h-5",
              terminal.tone === "error" ? "text-red-500" : "text-gray-500"
            )}
          />
        </div>
        <div>
          <p className="text-sm font-bold text-black">{terminal.title}</p>
          <p className="text-sm text-black/60 mt-0.5">{terminal.message}</p>
          <p className="text-xs text-black/40 mt-1.5">
            Pedido creado: {formatDate(confirmedAt)}
          </p>
        </div>
      </motion.div>
    );
  }

  const banner = bannerFor(estado, completedRank);
  const BannerIcon = banner.icon;

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
      {/* ── Top banner ── */}
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
                {banner.title}
              </motion.h3>
              <motion.p
                className="text-sm text-black/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, ...springConfigs.soft }}
              >
                Última actualización:{" "}
                <span className="font-semibold text-black/70">
                  {formatDate(lastRealUpdate)}
                </span>
              </motion.p>
            </div>

            <motion.div
              className="shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, ...springConfigs.bouncy }}
            >
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center",
                  banner.iconTone === "emerald"
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-amber-50 border-amber-200"
                )}
              >
                <BannerIcon
                  className={cn(
                    "w-5 h-5 sm:w-6 sm:h-6",
                    banner.iconTone === "emerald" ? "text-emerald-500" : "text-amber-500"
                  )}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Progress bar — fracción de hitos reales completados, no tiempo */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full rounded-r-full bg-emerald-500"
            initial={{ width: "0%" }}
            animate={{ width: `${(completedRank / (stages.length - 1)) * 100}%` }}
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
        <HorizontalTimeline stages={stages} completedRank={completedRank} />
        <VerticalTimeline stages={stages} completedRank={completedRank} />

        {/* ── Footer ── */}
        <motion.div
          variants={staggerItemVariants}
          className="mt-5 pt-4 border-t border-black/5 flex items-center gap-2 text-xs text-black/40"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Estados basados en la información real de tu pedido. ¿Dudas?
            Contacta con nosotros indicando tu número de pedido.
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default OrderTimeline;
