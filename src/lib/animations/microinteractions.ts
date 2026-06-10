/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  MICROINTERACTIONS — Librería centralizada de animaciones HEALZYP
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *  Reutiliza y mejora las animaciones dispersas por el proyecto.
 *  Exporta variants, hooks y helpers tipados para Framer Motion.
 *
 *  Uso típico:
 *    import { springConfigs, fadeInUpVariants, useAnimatedCounter } from "@/lib/animations/microinteractions";
 *
 *    <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible">
 *      …
 *    </motion.div>
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  RefObject,
} from "react";
import {
  useMotionValue,
  useSpring,
  useInView,
  Variants,
  Transition,
} from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  1. SPRING CONFIGS  (físicas optimizadas)                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Tipo base para todas las configs de spring */
export type SpringType = "soft" | "snappy" | "bouncy" | "lift" | "gentle";

export interface SpringConfig {
  type: "spring";
  stiffness: number;
  damping: number;
  mass?: number;
}

/** Colección de springs calibrados para distintos casos de uso */
export const springConfigs: Record<SpringType, SpringConfig> = {
  /** Para animaciones suaves de entrada (cards, secciones) */
  soft: { type: "spring", stiffness: 300, damping: 28, mass: 0.8 },

  /** Para interacciones rápidas (tap, click, toggle) */
  snappy: { type: "spring", stiffness: 500, damping: 30, mass: 0.8 },

  /** Para rebotes llamativos (badges, notificaciones, popovers) */
  bouncy: { type: "spring", stiffness: 400, damping: 18, mass: 0.8 },

  /** Para hover lift (cards, botones que se elevan) */
  lift: { type: "spring", stiffness: 350, damping: 25, mass: 0.6 },

  /** Para movimientos sutiles (parallax, floating elements) */
  gentle: { type: "spring", stiffness: 260, damping: 24, mass: 0.9 },
};

/** Helper: obtiene una config de spring por nombre */
export const getSpringConfig = (type: SpringType = "soft"): SpringConfig =>
  springConfigs[type];

/** Helper: mergea una config base con overrides */
export const mergeSpring = (
  base: SpringType | SpringConfig,
  overrides: Partial<SpringConfig>
): SpringConfig => {
  const config = typeof base === "string" ? springConfigs[base] : base;
  return { ...config, ...overrides };
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  2. VARIANTS REUTILIZABLES                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** ── Fade In + Up ──────────────────────────────────────────────────────── */
export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfigs.soft,
  },
};

/** ── Fade In + Scale ───────────────────────────────────────────────────── */
export const fadeInScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springConfigs.soft,
  },
};

/** ── Fade In + Blur (efecto "revelado") ────────────────────────────────── */
export const fadeInBlurVariants: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: springConfigs.soft,
  },
};

/** ── Slide In desde un lado ────────────────────────────────────────────── */
export const createSlideInVariants = (
  direction: "left" | "right" | "up" | "down" = "up",
  distance: number = 60
): Variants => {
  const offsets = {
    left:  { x: -distance, y: 0 },
    right: { x:  distance, y: 0 },
    up:    { x: 0, y:  distance },
    down:  { x: 0, y: -distance },
  };
  return {
    hidden: { opacity: 0, ...offsets[direction] },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: springConfigs.soft,
    },
  };
};

/** ── Bounce (escala + rebote) ──────────────────────────────────────────── */
export const bounceVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springConfigs.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

/** ── Hover Lift (para cards, botones) ──────────────────────────────────── */
export const hoverLiftVariants: Variants = {
  rest:  { y: 0,  scale: 1,   transition: springConfigs.lift },
  hover: { y: -6, scale: 1.02, transition: springConfigs.lift },
  tap:   { scale: 0.97,       transition: springConfigs.snappy },
};

/** ── Magnetic Button (atracción al cursor) ─────────────────────────────── */
export const magneticButtonVariants: Variants = {
  rest:  { x: 0, y: 0 },
  hover: { transition: springConfigs.gentle },
};

/** ── Stagger Container ─────────────────────────────────────────────────── */
export const staggerContainerVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

/** ── Stagger Item ──────────────────────────────────────────────────────── */
export const staggerItemVariants: Variants = {
  hidden:  { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: springConfigs.soft,
  },
};

/** ── Stagger Grid Item (con delay basado en índice) ────────────────────── */
export const createStaggerGridItem = (
  index: number,
  baseDelay: number = 0.05
): Variants => ({
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...springConfigs.soft,
      delay: index * baseDelay,
    },
  },
});

/** ── Modal Overlay ─────────────────────────────────────────────────────── */
export const modalOverlayVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

/** ── Modal Content ─────────────────────────────────────────────────────── */
export const modalContentVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springConfigs.soft,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 10,
    transition: { duration: 0.2 },
  },
};

/** ── Toast / Notification ──────────────────────────────────────────────── */
export const toastVariants: Variants = {
  hidden:  { opacity: 0, x: 60, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springConfigs.bouncy,
  },
  exit: {
    opacity: 0,
    x: 40,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

/** ── Page Transition ───────────────────────────────────────────────────── */
export const pageTransitionVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...springConfigs.soft, duration: 0.4 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

/** ── Skeleton Shimmer ──────────────────────────────────────────────────── */
export const skeletonShimmerVariants: Variants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "linear",
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  3. HOOKS CUSTOM                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook: Contador animado con framer-motion animate()
 *
 * @param target    valor final
 * @param duration  segundos (default 2)
 * @returns string formateado con locale
 *
 * Uso:
 *   const count = useAnimatedCounter(2000, 1.5);
 *   return <span>{count}</span>;
 */
export const useAnimatedCounter = (
  target: number,
  duration: number = 2
): string => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, target, duration]);

  return value.toLocaleString();
};

/**
 * Hook: gestiona estado de skeleton loading con delay mínimo
 *
 * @param isLoading    estado real de carga
 * @param minDuration  ms mínimos que el skeleton debe mostrarse (default 400)
 * @returns boolean    true = mostrar skeleton
 *
 * Uso:
 *   const showSkeleton = useSkeletonLoading(isFetching, 600);
 */
export const useSkeletonLoading = (
  isLoading: boolean,
  minDuration: number = 400
): boolean => {
  const [show, setShow] = useState(isLoading);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
      startTime.current = performance.now();
    } else {
      const elapsed = performance.now() - startTime.current;
      const remaining = Math.max(0, minDuration - elapsed);
      timer.current = setTimeout(() => setShow(false), remaining);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isLoading, minDuration]);

  return show;
};

/**
 * Hook: efecto magnético en botón (atrae el elemento hacia el cursor)
 *
 * @param ref   RefObject del elemento
 * @param strength  intensidad del magnetismo (default 0.3)
 * @returns   { x, y } valores de spring para aplicar en style
 *
 * Uso:
 *   const ref = useRef<HTMLButtonElement>(null);
 *   const { x, y } = useMagneticButton(ref, 0.3);
 *   return <motion.button ref={ref} style={{ x, y }}>…</motion.button>;
 */
export const useMagneticButton = (
  ref: RefObject<HTMLElement | null>,
  strength: number = 0.3
) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, springConfigs.gentle);
  const springY = useSpring(y, springConfigs.gentle);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distX = (e.clientX - centerX) * strength;
      const distY = (e.clientY - centerY) * strength;
      x.set(distX);
      y.set(distY);
    };

    const handleLeave = () => {
      x.set(0);
      y.set(0);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [ref, strength, x, y]);

  return { x: springX, y: springY };
};

/**
 * Hook: detecta dirección del scroll
 *
 * @returns "up" | "down" | null
 *
 * Uso:
 *   const direction = useScrollDirection();
 *   const showNav = direction === "up";
 */
export const useScrollDirection = (): "up" | "down" | null => {
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

/**
 * Hook: animación al entrar en viewport con variants predefinidas
 *
 * @param variantName  nombre del variant a usar
 * @returns  { ref, variants, initial, whileInView, viewport }
 *
 * Uso:
 *   const anim = useInViewAnimation("fadeInUp");
 *   return <motion.div {...anim}>…</motion.div>;
 */
export const useInViewAnimation = (
  variantName: "fadeInUp" | "fadeInScale" | "fadeInBlur" | "slideInLeft" | "slideInRight" = "fadeInUp"
) => {
  const ref = useRef<HTMLDivElement>(null);

  const variantsMap: Record<string, Variants> = {
    fadeInUp:    fadeInUpVariants,
    fadeInScale: fadeInScaleVariants,
    fadeInBlur:  fadeInBlurVariants,
    slideInLeft: createSlideInVariants("left"),
    slideInRight:createSlideInVariants("right"),
  };

  return {
    ref,
    variants: variantsMap[variantName],
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-60px" },
  };
};

/**
 * Hook: auto-hide con timer (útil para toasts, tooltips, smart bars)
 *
 * @param active        estado activo
 * @param hideDelay     ms antes de ocultar (default 5000)
 * @param onHide        callback al ocultar
 * @returns boolean     true = visible
 *
 * Uso:
 *   const visible = useAutoHide(isActive, 3000, () => setActive(false));
 */
export const useAutoHide = (
  active: boolean,
  hideDelay: number = 5000,
  onHide?: () => void
): boolean => {
  const [visible, setVisible] = useState(active);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setVisible(false);
        onHide?.();
      }, hideDelay);
    } else {
      setVisible(false);
      if (timer.current) clearTimeout(timer.current);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, hideDelay, onHide]);

  return visible;
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  4. HELPERS & UTILS                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Calcula delay escalonado para un índice dado */
export const getStaggerDelay = (
  index: number,
  baseDelay: number = 0.05,
  maxDelay: number = 0.8
): number => Math.min(index * baseDelay, maxDelay);

/** Crea un transition de fade simple con duración fija */
export const createFadeTransition = (duration: number = 0.3): Transition => ({
  duration,
  ease: [0.4, 0, 0.2, 1], // ease-out-cubic
});

/** CSS inline para skeleton shimmer (usar con className en div) */
export const skeletonShimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)",
  backgroundSize: "200% 100%",
  animation: "healzyp-shimmer 1.5s linear infinite",
};

/** Keyframes string para inyectar en un `<style>` global o componente */
export const shimmerKeyframes = `
@keyframes healzyp-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  5. TRANSITION PRESETS (para non-spring anims)                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

export const smoothTransitionConfig: Transition = {
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1],
};

export const fastTransitionConfig: Transition = {
  duration: 0.2,
  ease: [0.4, 0, 1, 1],
};

export const slowTransitionConfig: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  6. PRE-BUILT STYLE OBJECTS (para className-less inline usage)             */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Objeto motion props listo para copiar-pegar en botones CTA brand */
export const ctaButtonMotionProps = {
  whileHover: { y: -3, scale: 1.02 },
  whileTap:   { scale: 0.97 },
  transition: springConfigs.lift,
};

/** Objeto motion props para cards de producto */
export const productCardMotionProps = {
  whileHover: { y: -6 },
  transition: springConfigs.lift,
};

/** Objeto motion props para iconos que hacen pulse */
export const iconPulseMotionProps = {
  animate: { scale: [1, 1.15, 1] },
  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
};
