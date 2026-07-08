"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Sparkles, Truck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import ProductCard from "@/components/common/ProductCard";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { Product } from "@/types/product.types";
import { generateDummyProducts } from "@/lib/dummy-products";

/* ------------------------------------------------------------------ */
/*  CONFIG                                                             */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 12;
const INTERSTITIAL_EVERY_PAGES = 2; // intersticial cada 2 páginas (24 items)
const LOAD_MORE_BUTTON_AFTER_PAGES = 4; // botón explícito tras 4 páginas (48 items)
const TOTAL_PRODUCTS = 120;

const SPRING_SOFT = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
};

/* ------------------------------------------------------------------ */
/*  SKELETON                                                           */
/* ------------------------------------------------------------------ */

const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col items-start animate-pulse">
      <div className="bg-[#F0EEED] rounded-[13px] lg:rounded-[20px] w-full aspect-square mb-2.5 xl:mb-4 overflow-hidden">
        <div className="w-full h-full bg-black/5" />
      </div>
      <div className="h-4 w-3/4 bg-black/10 rounded mb-2" />
      <div className="h-3 w-1/2 bg-black/10 rounded mb-2" />
      <div className="h-5 w-1/3 bg-black/10 rounded" />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  INTERSTICIAL                                                       */
/* ------------------------------------------------------------------ */

const IntersticialBanner: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={SPRING_SOFT}
      className={cn(
        "relative overflow-hidden rounded-[20px] md:rounded-[24px]",
        "bg-brand px-6 py-8 md:px-10 md:py-10",
        "text-white flex flex-col md:flex-row items-center justify-between gap-6"
      )}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />

      <div className="relative z-10 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Oferta especial
        </div>
        <h3 className={cn(integralCF.className, "text-2xl md:text-3xl mb-2")}>
          Envío gratis en tu 2º pedido
        </h3>
        <p className="text-sm text-white/80 max-w-sm">
          Usa el código <strong className="text-white">HEALZYP2</strong> al finalizar la compra y obtén envío gratis.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 shrink-0">
        <div className="hidden md:flex flex-col items-center gap-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3">
          <Truck className="w-6 h-6" />
          <span className="text-[10px] font-medium">Gratis</span>
        </div>
        <Button
          variant="secondary"
          className="rounded-full bg-white text-brand hover:bg-white/90 font-bold h-11 px-6 shadow-lg"
        >
          <Zap className="w-4 h-4 mr-2" />
          Aprovechar
        </Button>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  HOOK: infinite pagination                                          */
/* ------------------------------------------------------------------ */

function useInfiniteProducts(allProducts: Product[]) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE * 2);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const currentPage = Math.ceil(visibleCount / PAGE_SIZE);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    // Simula delay de API
    const timer = setTimeout(() => {
      setVisibleCount((prev) => {
        const next = prev + PAGE_SIZE;
        if (next >= allProducts.length) {
          setHasMore(false);
          return allProducts.length;
        }
        return next;
      });
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [isLoading, hasMore, allProducts.length]);

  const visibleProducts = useMemo(
    () => allProducts.slice(0, visibleCount),
    [allProducts, visibleCount]
  );

  const showExplicitButton =
    hasMore && currentPage >= LOAD_MORE_BUTTON_AFTER_PAGES && !isLoading;

  return {
    visibleProducts,
    isLoading,
    hasMore,
    loadMore,
    currentPage,
    showExplicitButton,
  };
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

const InfiniteScrollHybrid: React.FC = () => {
  const allProducts = useMemo(() => generateDummyProducts(TOTAL_PRODUCTS), []);
  const {
    visibleProducts,
    isLoading,
    hasMore,
    loadMore,
    showExplicitButton,
  } = useInfiniteProducts(allProducts);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /* --- Intersection Observer for auto-load after button --- */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore]);

  /* --- build blocks with interstitials --- */
  const blocks = useMemo(() => {
    const result: Array<{ type: "products"; items: Product[] } | { type: "interstitial" }> = [];

    let remaining = [...visibleProducts];
    let pageCount = 0;

    while (remaining.length > 0) {
      const chunk = remaining.slice(0, PAGE_SIZE);
      remaining = remaining.slice(PAGE_SIZE);
      result.push({ type: "products", items: chunk });
      pageCount++;

      // Insert interstitial every N pages (except if no more products)
      if (pageCount % INTERSTITIAL_EVERY_PAGES === 0 && remaining.length > 0) {
        result.push({ type: "interstitial" });
      }
    }

    return result;
  }, [visibleProducts]);

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Blocks */}
      <AnimatePresence mode="popLayout">
        {blocks.map((block, blockIdx) => {
          if (block.type === "interstitial") {
            return (
              <motion.div
                key={`interstitial-${blockIdx}`}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ ...SPRING_SOFT, delay: 0.1 }}
              >
                <IntersticialBanner />
              </motion.div>
            );
          }

          return (
            <motion.div
              key={`block-${blockIdx}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING_SOFT}
              className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5"
            >
              {block.items.map((product) => (
                <ProductCard key={product.id} data={product} />
              ))}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Skeleton loading */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5"
          >
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <ProductCardSkeleton key={`skeleton-${i}`} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explicit "Ver más" button */}
      <AnimatePresence>
        {showExplicitButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={SPRING_SOFT}
            className="flex justify-center pt-4"
          >
            <Button
              onClick={loadMore}
              className={cn(
                "rounded-full h-13 px-10 text-base font-bold bg-brand hover:bg-brand-hover text-white",
                "shadow-[0_8px_24px_rgba(72,125,38,0.3)] hover:shadow-[0_12px_32px_rgba(72,125,38,0.4)]",
                "transition-shadow"
              )}
            >
              Ver más productos
              <ArrowDown className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End of list message */}
      {!hasMore && !isLoading && visibleProducts.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-black/40 pt-4"
        >
          Has visto todos los productos
        </motion.p>
      )}

      {/* Intersection Observer sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden="true" />}
    </div>
  );
};

export default InfiniteScrollHybrid;
