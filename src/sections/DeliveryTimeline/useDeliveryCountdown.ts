"use client";

import { useState, useEffect, useMemo } from "react";

const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return result;
}

function formatDateLong(date: Date): string {
  const dayName = DAY_NAMES[date.getDay()];
  const dayNum = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  return `${dayName} ${dayNum} de ${month}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0h 0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export interface DeliveryCountdown {
  deliveryDate: Date;
  formattedDate: string;
  formattedDateShort: string;
  isBeforeCutoff: boolean;
  isWeekend: boolean;
  cutoffDate: Date;
  countdownText: string;
  businessDays: number;
}

export function useDeliveryCountdown(): DeliveryCountdown {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return useMemo<DeliveryCountdown>(() => {
    const dayOfWeek = currentTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const cutoffDate = new Date(currentTime);
    cutoffDate.setHours(14, 0, 0, 0);

    const isBeforeCutoff = currentTime < cutoffDate;

    // Fin de semana: calculamos desde el lunes con 2 días hábiles
    // Laborables antes de 14:00: +2 días hábiles
    // Laborables después de 14:00: +3 días hábiles
    const businessDays = isWeekend ? 2 : isBeforeCutoff ? 2 : 3;

    const deliveryDate = addBusinessDays(currentTime, businessDays);
    const formattedDate = formatDateLong(deliveryDate);
    const formattedDateShort = DAY_NAMES[deliveryDate.getDay()];

    const cutoffDiff = cutoffDate.getTime() - currentTime.getTime();
    const countdownText =
      !isWeekend && isBeforeCutoff && cutoffDiff > 0
        ? formatCountdown(cutoffDiff)
        : "";

    return {
      deliveryDate,
      formattedDate,
      formattedDateShort,
      isBeforeCutoff,
      isWeekend,
      cutoffDate,
      countdownText,
      businessDays,
    };
  }, [currentTime]);
}
