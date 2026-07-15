"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Package, Truck, Home, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeliveryCountdown } from "./useDeliveryCountdown";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

type StepStatus = "completed" | "active" | "future";

interface TimelineStep {
  id: number;
  shortLabel: string;
  hours: string;
  icon: React.ElementType;
  status: StepStatus;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function DeliveryTimeline() {
  const {
    formattedDate,
    isBeforeCutoff,
    isWeekend,
    countdownText,
  } = useDeliveryCountdown();

  const [visible, setVisible] = useState(false);
  const [counterKey, setCounterKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  /* IntersectionObserver — animación de entrada */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Micro-animación del contador cada vez que cambia el texto */
  useEffect(() => {
    if (countdownText) setCounterKey((k) => k + 1);
  }, [countdownText]);

  const steps: TimelineStep[] = [
    {
      id: 0,
      shortLabel: "Conf",
      hours: "Inm.",
      icon: Check,
      status: "completed",
    },
    {
      id: 1,
      shortLabel: "Prep",
      hours: "24h",
      icon: Package,
      status: "completed",
    },
    {
      id: 2,
      shortLabel: "Env",
      hours: "48h",
      icon: Truck,
      status: "active",
    },
    {
      id: 3,
      shortLabel: "Ent",
      hours: "72h",
      icon: Home,
      status: "future",
    },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-[14px] border border-[#e5e7eb] transition-all duration-[400ms] ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[10px]"
      )}
      style={{ padding: "12px 16px" }}
    >
      {/* ── Línea 1: banner + contador ───────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[13px] text-gray-700 leading-tight">
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />

        {isWeekend ? (
          <>
            <span>Pedido procesado el lunes. Recibirás tu pedido el</span>
            <span className="relative inline-block text-[#2d6a2d] font-bold uppercase text-[13px] underline-draw-target">
              {formattedDate}
            </span>
          </>
        ) : isBeforeCutoff ? (
          <>
            <span>Si compras antes de las 14:00h recibirás tu pedido el</span>
            <span className="relative inline-block text-[#2d6a2d] font-bold uppercase text-[13px] underline-draw-target">
              {formattedDate}
            </span>
          </>
        ) : (
          <>
            <span>Si compras ahora recibirás tu pedido el</span>
            <span className="relative inline-block text-[#2d6a2d] font-bold uppercase text-[13px] underline-draw-target">
              {formattedDate}
            </span>
          </>
        )}

        {!isWeekend && isBeforeCutoff && countdownText && (
          <>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <span className="inline-flex items-center gap-1 text-[#2d6a2d] font-bold text-sm tabular-nums">
              ⏱
              <span
                key={counterKey}
                className="inline-block animate-countdown-pulse"
              >
                {countdownText}
              </span>
            </span>
          </>
        )}
      </div>

      {/* ── Línea 2: barra de pasos compacta ─────────────────────────────── */}
      <div className="relative mt-2">
        {/* Barra gris punteada (fondo) */}
        <div
          className={cn(
            "absolute top-[13px] left-[12.5%] right-[12.5%] h-[2px] border-t-2 border-dashed border-gray-300 transition-opacity duration-300",
            visible ? "opacity-100 delay-[800ms]" : "opacity-0"
          )}
        />

        {/* Barra verde de progreso */}
        <div
          className={cn(
            "absolute top-[13px] left-[12.5%] h-[2px] bg-[#2d6a2d] transition-[width] duration-[800ms] ease-out",
            visible ? "w-[50%]" : "w-0"
          )}
        />

        {/* Círculos + labels */}
        <div className="grid grid-cols-4 relative">
          {steps.map((step, index) => {
            const isCompleted = step.status === "completed";
            const isActive = step.status === "active";
            const isFuture = step.status === "future";
            const Icon = isCompleted ? Check : step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Círculo 28px */}
                <div
                  className={cn(
                    "relative w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300",
                    visible ? "scale-100" : "scale-0"
                  )}
                  style={{
                    transitionDelay: visible ? `${index * 200}ms` : "0ms",
                  }}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-[#f59e0b]/30 animate-pulse-ring" />
                  )}
                  <div
                    className={cn(
                      "relative w-full h-full rounded-full flex items-center justify-center",
                      isCompleted && "bg-[#2d6a2d]",
                      isActive && "bg-[#f59e0b]",
                      isFuture && "bg-[#d1d5db]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        (isCompleted || isActive || isFuture) && "text-white"
                      )}
                      strokeWidth={2.5}
                    />
                  </div>
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-1 text-[11px] font-bold uppercase tracking-wide text-center",
                    isCompleted && "text-[#2d6a2d]",
                    isActive && "text-[#f59e0b]",
                    isFuture && "text-gray-400"
                  )}
                >
                  {step.shortLabel}
                </span>

                {/* Sublabel */}
                <span className="text-[10px] text-gray-400 text-center leading-tight">
                  {step.hours}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Animaciones CSS puras ────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
        @keyframes countdown-pulse {
          0%   { transform: scale(1);   }
          50%  { transform: scale(1.1); }
          100% { transform: scale(1);   }
        }
        @keyframes underline-draw {
          from { width: 0; }
          to   { width: 100%; }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.5s ease-out infinite;
        }
        .animate-countdown-pulse {
          animation: countdown-pulse 300ms ease-out;
        }
        .underline-draw-target::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          height: 2px;
          background: currentColor;
          width: 0;
          animation: underline-draw 500ms ease-out forwards;
          animation-delay: 600ms;
        }
      `}</style>
    </div>
  );
}
