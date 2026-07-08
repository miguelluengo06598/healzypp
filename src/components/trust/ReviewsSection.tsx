"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";

import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Rating from "@/components/ui/Rating";
import VerifiedPurchaseBadge from "./VerifiedPurchaseBadge";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  TYPES & DATA                                                       */
/* ------------------------------------------------------------------ */

type ReviewItem = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  location?: string;
};

const DUMMY_REVIEWS: ReviewItem[] = [
  {
    id: 1,
    name: "María G.",
    rating: 5,
    comment:
      "Llevo 3 semanas tomando las gominolas y noto una digestión mucho más ligera. El sabor es delicioso, no parecen un suplemento.",
    date: "2025-11-15",
    verified: true,
    location: "Madrid",
  },
  {
    id: 2,
    name: "Carlos R.",
    rating: 5,
    comment:
      "Pedí el pack de 3 botes y me salió súper bien de precio. Envío rápido y el packaging es muy cuidado. Repetiré seguro.",
    date: "2025-11-20",
    verified: true,
    location: "Barcelona",
  },
  {
    id: 3,
    name: "Ana S.",
    rating: 4,
    comment:
      "Buen producto, aunque me hubiera gustado que trajeran más variedad de sabores. Por lo demás, excelente calidad.",
    date: "2025-10-28",
    verified: true,
  },
  {
    id: 4,
    name: "Luis M.",
    rating: 5,
    comment:
      "Mi nutricionista me lo recomendó y la verdad es que noto diferencia. Me siento con más energía durante el día.",
    date: "2025-12-01",
    verified: true,
    location: "Valencia",
  },
  {
    id: 5,
    name: "Elena P.",
    rating: 5,
    comment:
      "Compré el pack para toda la familia y todos estamos encantados. Las niñas las toman sin quejas, eso dice mucho.",
    date: "2025-12-05",
    verified: true,
    location: "Sevilla",
  },
  {
    id: 6,
    name: "Jorge T.",
    rating: 4,
    comment:
      "Calidad premium. Se nota que son ingredientes naturales. El envío tardó un día más de lo previsto, pero mereció la pena.",
    date: "2025-11-08",
    verified: false,
  },
  {
    id: 7,
    name: "Sofía L.",
    rating: 5,
    comment:
      "Llevaba tiempo buscando un suplemento de vinagre de manzana que no supiera fatal. ¡Este es perfecto! Sabor a manzana natural.",
    date: "2025-12-10",
    verified: true,
    location: "Bilbao",
  },
  {
    id: 8,
    name: "Andrés H.",
    rating: 5,
    comment:
      "Increíble relación calidad-precio. He probado otras marcas más caras y este da los mismos resultados. Cliente fijo desde ahora.",
    date: "2025-11-25",
    verified: true,
  },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcAverage(reviews: ReviewItem[]): number {
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                     */
/* ------------------------------------------------------------------ */

const ReviewCard: React.FC<{ review: ReviewItem }> = ({ review }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex flex-col h-full bg-white border border-black/10 rounded-[20px] p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
              {review.name.charAt(0)}
            </span>
            <div>
              <span className="font-bold text-black text-sm leading-tight block">
                {review.name}
              </span>
              {review.location && (
                <span className="text-[10px] text-black/40">
                  {review.location}
                </span>
              )}
            </div>
          </div>
          {review.verified && (
            <div className="mt-1">
              <VerifiedPurchaseBadge text="Compra verificada" pulse={false} />
            </div>
          )}
        </div>
        <Rating
          initialValue={review.rating}
          allowFraction
          SVGclassName="inline-block"
          emptyClassName="fill-gray-200"
          fillColor="#487D26"
          size={16}
          readonly
        />
      </div>

      {/* Comment */}
      <p className="text-black/70 text-sm leading-relaxed flex-1 mb-4">
        &ldquo;{review.comment}&rdquo;
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <time className="text-black/40 text-xs" dateTime={review.date}>
          {formatDate(review.date)}
        </time>
        {review.rating === 5 && (
          <Badge
            variant="trending"
            className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4"
          >
            Top review
          </Badge>
        )}
      </div>
    </motion.article>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN                                                               */
/* ------------------------------------------------------------------ */

interface ReviewsSectionProps {
  className?: string;
  reviews?: ReviewItem[];
  title?: string;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  className,
  reviews = DUMMY_REVIEWS,
  title = "Lo que dicen nuestros clientes",
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const average = calcAverage(reviews);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  return (
    <section className={cn("max-w-frame mx-auto px-4 xl:px-0", className)}>
      <hr className="h-[1px] border-t-black/10 mb-10 sm:mb-16" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
        <div>
          <h2
            className={cn(
              integralCF.className,
              "text-[32px] md:text-5xl capitalize mb-2"
            )}
          >
            {title}
          </h2>
          <p className="text-sm text-black/50">
            Basado en {reviews.length} opiniones verificadas
          </p>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 bg-[#F7F8F5] rounded-[16px] px-5 py-3">
          <span className="text-4xl font-bold text-black">
            {average.toFixed(1)}
          </span>
          <div className="flex flex-col">
            <Rating
              initialValue={average}
              allowFraction
              SVGclassName="inline-block"
              emptyClassName="fill-gray-200"
              fillColor="#487D26"
              size={18}
              readonly
            />
            <span className="text-xs text-black/50 mt-0.5">
              {reviews.length} reseñas
            </span>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <Carousel setApi={setApi} opts={{ align: "start", loop: false }}>
        <CarouselContent className="-ml-4">
          {reviews.map((review) => (
            <CarouselItem
              key={review.id}
              className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <ReviewCard review={review} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Controls */}
      <div className="flex items-center justify-between mt-8">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollPrev}
            disabled={current === 0}
            className={cn(
              "w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-all",
              current === 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-brand hover:text-white hover:border-brand"
            )}
          >
            <FaArrowLeft className="text-sm" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollNext}
            disabled={current === count - 1}
            className={cn(
              "w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-all",
              current === count - 1
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-brand hover:text-white hover:border-brand"
            )}
          >
            <FaArrowRight className="text-sm" />
          </motion.button>
        </div>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-6 h-2 bg-brand"
                  : "w-2 h-2 bg-black/20 hover:bg-black/40"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
