"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, Truck, Leaf, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { newArrivalsData } from "@/data/products";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type StatItem = {
  value: number;
  suffix: string;
  label: string;
};

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const STATS: StatItem[] = [
  { value: 100, suffix: "%", label: "Ingredientes Naturales" },
  { value: 2000, suffix: "+", label: "Clientes Satisfechos" },
  { value: 30, suffix: "", label: "Días de devolución" },
];

const FLOATING_BADGES = [
  { icon: Truck, label: "Envío gratis", top: "12%", left: "8%", delay: 0.3 },
  { icon: Leaf, label: "100% Natural", top: "65%", left: "0%", delay: 0.6 },
  { icon: ShieldCheck, label: "Garantía 30d", top: "25%", right: "5%", delay: 0.9 },
];

/* ------------------------------------------------------------------ */
/*  SPRING CONFIGS                                                     */
/* ------------------------------------------------------------------ */

const SPRING_LIFT = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
};

/* ------------------------------------------------------------------ */
/*  SKELETON                                                           */
/* ------------------------------------------------------------------ */

const HeroSkeleton: React.FC = () => {
  return (
    <section className="relative min-h-[80vh] md:min-h-[90vh] overflow-hidden">
      <div className="max-w-frame mx-auto px-4 xl:px-0 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
          {/* Text skeleton */}
          <div className="lg:col-span-7 space-y-6">
            <div className="h-6 w-32 bg-black/10 rounded-full animate-pulse" />
            <div className="h-14 w-3/4 bg-black/10 rounded-xl animate-pulse" />
            <div className="h-14 w-1/2 bg-black/10 rounded-xl animate-pulse" />
            <div className="h-4 w-full max-w-md bg-black/10 rounded animate-pulse" />
            <div className="h-4 w-2/3 max-w-sm bg-black/10 rounded animate-pulse" />
            <div className="flex gap-3 pt-2">
              <div className="h-12 w-40 bg-black/10 rounded-full animate-pulse" />
              <div className="h-12 w-40 bg-black/10 rounded-full animate-pulse" />
            </div>
          </div>
          {/* Visual skeleton */}
          <div className="lg:col-span-5 relative aspect-square bg-black/5 rounded-[20px] animate-pulse" />
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

const HeroSectionDynamica: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLElement>(null);

  /* Simula carga inicial (en producción sería data fetching real) */
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  /* Parallax scroll */
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const yVisual = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yBadges = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const rotateVisual = useTransform(scrollYProgress, [0, 1], [0, -4]);

  if (isLoading) return <HeroSkeleton />;

  return (
    <section
      ref={containerRef}
      className="relative min-h-[85vh] md:min-h-[90vh] overflow-hidden isolate"
    >
      {/* ============================================================ */}
      {/*  ANIMATED GRADIENT BACKGROUND                                */}
      {/* ============================================================ */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background:
              "linear-gradient(135deg, #F2F0F1 0%, #E8F0E0 25%, #F2F0F1 50%, #EEF5E8 75%, #F2F0F1 100%)",
            backgroundSize: "400% 400%",
          }}
        />
        {/* Glass orb accents */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#487D26]/5 blur-[80px]" />
      </div>

      {/* Inline keyframes for gradient animation */}
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 12s ease infinite;
        }
      `}</style>

      {/* ============================================================ */}
      {/*  CONTENT GRID                                                */}
      {/* ============================================================ */}
      <div className="relative max-w-frame mx-auto px-4 xl:px-0 h-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full py-16 md:py-24">
          {/* ---------- TEXT SIDE (60~65%) ---------- */}
          <motion.div
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="show"
            className="lg:col-span-7 xl:col-span-7 space-y-5 md:space-y-6"
          >
            {/* Badge */}
            <motion.div variants={STAGGER_ITEM}>
              <Badge
                variant="trending"
                className="px-3 py-1 text-xs font-semibold tracking-wide uppercase"
              >
                <Sparkles className="w-3 h-3 mr-1.5" />
                Novedad 2026
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={STAGGER_ITEM}
              className={cn(
                integralCF.className,
                "text-[40px] leading-[44px] sm:text-5xl sm:leading-[52px] md:text-[56px] md:leading-[60px] lg:text-[64px] lg:leading-[68px] text-black"
              )}
            >
              Bienestar real{" "}
              <span className="relative inline-block">
                <span className="relative z-10">para tu día a día</span>
                <span className="absolute bottom-2 left-0 w-full h-3 bg-brand/20 -rotate-1 rounded-sm -z-0" />
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={STAGGER_ITEM}
              className="text-base md:text-lg text-black/60 max-w-xl leading-relaxed"
            >
              Suplementos naturales diseñados para mejorar tu bienestar sin
              complicaciones. Calidad premium, resultados reales.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={STAGGER_ITEM}
              className="flex flex-col sm:flex-row gap-3 pt-1"
            >
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_LIFT}
              >
                <Button
                  asChild
                  className={cn(
                    "rounded-full h-13 px-8 text-base font-bold bg-brand hover:bg-brand-hover text-white",
                    "shadow-[0_8px_24px_rgba(72,125,38,0.35)] hover:shadow-[0_12px_32px_rgba(72,125,38,0.45)]",
                    "transition-shadow"
                  )}
                >
                  <Link href="/shop">
                    Comprar Ahora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_LIFT}
              >
                <Button
                  asChild
                  variant="outline"
                  className={cn(
                    "rounded-full h-13 px-8 text-base font-semibold border-black/15 bg-white/60 backdrop-blur-sm",
                    "hover:bg-white hover:border-black/25 hover:shadow-lg transition-all"
                  )}
                >
                  <Link href="/shop#new-arrivals">Descubrir</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={STAGGER_ITEM}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 md:pt-6"
            >
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="font-bold text-2xl md:text-3xl lg:text-[36px] text-black">
                    <AnimatedCounter from={0} to={stat.value} />
                    {stat.suffix}
                  </span>
                  <span className="text-xs md:text-sm text-black/50">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ---------- VISUAL SIDE (35~40%) ---------- */}
          <div className="lg:col-span-5 xl:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.3 }}
              style={{ y: yVisual, rotate: rotateVisual }}
              className="relative aspect-square max-w-[520px] mx-auto lg:mx-0"
            >
              {/* Main product image */}
              <div className="relative w-full h-full rounded-[24px] md:rounded-[32px] overflow-hidden bg-[#F0EEED] shadow-2xl">
                <Image
                  src="/images/FOTOVINDEMANPORT.png"
                  alt="Gominolas de vinagre de manzana HEALZYP"
                  fill
                  className="object-contain p-6 md:p-10"
                  priority
                  sizes="(max-width: 768px) 100vw, 520px"
                />
              </div>

              {/* Floating glass badges */}
              <motion.div style={{ y: yBadges }} className="absolute inset-0 pointer-events-none">
                {FLOATING_BADGES.map((b, i) => (
                  <motion.div
                    key={b.label}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.8 + b.delay, type: "spring", stiffness: 300, damping: 20 }}
                    className={cn(
                      "absolute flex items-center gap-2",
                      "bg-white/80 backdrop-blur-md border border-white/50",
                      "rounded-full px-3 py-2 shadow-lg pointer-events-auto"
                    )}
                    style={{
                      top: b.top,
                      left: b.left,
                      right: b.right,
                    }}
                  >
                    <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center">
                      <b.icon className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <span className="text-[11px] md:text-xs font-semibold text-black whitespace-nowrap">
                      {b.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Mini product card peek */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4, type: "spring", stiffness: 260, damping: 24 }}
                className={cn(
                  "absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6",
                  "bg-white/90 backdrop-blur-xl border border-white/60",
                  "rounded-[16px] p-2.5 shadow-xl flex items-center gap-3"
                )}
              >
                <div className="relative w-12 h-12 rounded-[10px] bg-[#F0EEED] overflow-hidden shrink-0">
                  <Image
                    src={newArrivalsData[0]?.srcUrl ?? "/images/FL1.png"}
                    alt="Producto"
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-black leading-tight">
                    Más vendido
                  </p>
                  <p className="text-[10px] text-black/50">Desde €29</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center shrink-0">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionDynamica;
