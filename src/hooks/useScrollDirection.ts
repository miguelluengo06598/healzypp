"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dirección del último scroll significativo (umbral de 12px).
 * Compartido entre MobileBottomNavigation (se oculta al bajar) y la barra
 * de compra móvil de la ficha de producto (se apila sobre el nav cuando
 * este es visible) — deben leer la misma señal para no solaparse.
 */
export const useScrollDirection = () => {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastY.current;
      if (Math.abs(diff) < 12) return;
      setDirection(diff > 0 ? "down" : "up");
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return direction;
};
