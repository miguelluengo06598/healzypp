"use client";

import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { FaCheckCircle } from "react-icons/fa";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Rating from "@/components/ui/Rating";
import {
  productReviewsData,
  type ProductReview,
} from "@/data/productReviewsData";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Convierte "2024-03-15" → "15 de marzo de 2024" */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${parseInt(day)} de ${MONTHS[parseInt(month) - 1]} de ${year}`;
}

/** Calcula la media de ratings redondeada a 1 decimal */
function calcAverage(reviews: ProductReview[]): number {
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/** Distribución de ratings (cuántas reseñas tienen cada puntuación 1-5) */
function calcDistribution(reviews: ProductReview[]): Record<number, number> {
  return reviews.reduce<Record<number, number>>((acc, r) => {
    acc[r.rating] = (acc[r.rating] ?? 0) + 1;
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: tarjeta individual de reseña
// ─────────────────────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="flex flex-col h-full bg-white border border-black/10 rounded-[20px] p-5 md:p-6 shadow-sm">
      {/* Cabecera: nombre + estrellas */}
      <div className="flex items-start justify-between mb-3 gap-2">
        {/* TODO: añade avatar de cliente si dispones de imagen */}
        <div className="flex flex-col">
          <span className="font-bold text-black text-sm md:text-base leading-tight">
            {review.name}
          </span>
          {/* Badge "Compra verificada" */}
          {review.verified && (
            <span className="flex items-center gap-1 text-[#487D26] text-xs mt-0.5 font-medium">
              <FaCheckCircle className="text-[10px]" />
              Compra verificada
            </span>
          )}
        </div>
        {/* Estrellas — fillColor verde de marca */}
        <Rating
          initialValue={review.rating}
          SVGclassName="inline-block"
          emptyClassName="fill-gray-200"
          fillColor="#487D26"
          size={16}
          readonly
        />
      </div>

      {/* Comentario */}
      <p className="text-black/70 text-sm leading-relaxed flex-1 mb-4">
        {/* TODO: si el texto es muy largo considera truncarlo con line-clamp */}
        &ldquo;{review.comment}&rdquo;
      </p>

      {/* Fecha */}
      <time
        dateTime={review.date}
        className="text-black/40 text-xs mt-auto"
      >
        {formatDate(review.date)}
      </time>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: barra de distribución de estrellas
// ─────────────────────────────────────────────────────────────────────────────

function RatingBar({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-black/60">
      <span className="w-6 text-right shrink-0">{stars}★</span>
      <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#487D26] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 shrink-0">{pct}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomerReviews() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // TODO: si en el futuro quieres filtrar las reseñas (ej. solo 5 estrellas),
  //       reemplaza productReviewsData por una versión filtrada aquí.
  const reviews = productReviewsData;

  const average = calcAverage(reviews);
  const distribution = calcDistribution(reviews);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  return (
    // ═══════════════════════════════════════════════════════════════════════
    // SECCIÓN 4 — RESEÑAS DE CLIENTES
    // Muestra 1 card en móvil, 2 en tablet, 3 en desktop.
    // Navega con flechas o puntitos debajo.
    // ═══════════════════════════════════════════════════════════════════════
    <section className="max-w-frame mx-auto px-4 xl:px-0 mb-[50px] sm:mb-20">
      <hr className="h-[1px] border-t-black/10 mb-10 sm:mb-16" />

      {/* Cabecera de sección — TODO: cambia el título si lo deseas */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10 md:mb-14">
        <h2
          className={cn([
            integralCF.className,
            "text-[32px] md:text-5xl capitalize",
          ])}
        >
          Opiniones verificadas
        </h2>

        {/* Resumen de valoración + distribución */}
        <div className="flex items-start gap-6 shrink-0">
          {/* Número grande + estrellas */}
          <div className="flex flex-col items-center">
            <span className="text-[56px] font-bold leading-none text-black">
              {average.toFixed(1)}
            </span>
            <Rating
              initialValue={average}
              allowFraction
              SVGclassName="inline-block"
              emptyClassName="fill-gray-200"
              fillColor="#487D26"
              size={20}
              readonly
            />
            {/* TODO: actualiza este número si el total cambia */}
            <span className="text-black/50 text-xs mt-1">
              {reviews.length} opiniones
            </span>
          </div>

          {/* Barras de distribución 5→1 */}
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            {[5, 4, 3, 2, 1].map((s) => (
              <RatingBar
                key={s}
                stars={s}
                count={distribution[s] ?? 0}
                total={reviews.length}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Carousel de reseñas ───────────────────────────────────────────── */}
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: false }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {reviews.map((review) => (
            <CarouselItem
              key={review.id}
              // 1 columna móvil · 2 tablet · 3 desktop
              className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <ReviewCard review={review} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* ── Controles de navegación ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-8">
        {/* Flechas — mismo estilo ghost que el resto del proyecto */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={current === 0}
            aria-label="Reseña anterior"
            className={cn(
              "w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-all",
              current === 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-[#487D26] hover:text-white hover:border-[#487D26]"
            )}
          >
            <FaArrowLeft className="text-sm" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            disabled={current === count - 1}
            aria-label="Reseña siguiente"
            className={cn(
              "w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-all",
              current === count - 1
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-[#487D26] hover:text-white hover:border-[#487D26]"
            )}
          >
            <FaArrowRight className="text-sm" />
          </button>
        </div>

        {/* Dots de posición — TODO: oculta los dots si prefieres solo flechas */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[240px] sm:max-w-none py-1">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => api?.scrollTo(i)}
              aria-label={`Ir a la reseña ${i + 1}`}
              className={cn(
                "rounded-full shrink-0 transition-all duration-300",
                i === current
                  ? "w-6 h-2 bg-[#487D26]"
                  : "w-2 h-2 bg-black/20 hover:bg-black/40"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
