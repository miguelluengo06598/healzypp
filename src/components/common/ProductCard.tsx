"use client";

import React, { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Flame, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Rating from "@/components/ui/Rating";
import { cn } from "@/lib/utils";
import { Product } from "@/types/product.types";
import { useAppDispatch } from "@/lib/hooks/redux";
import { addToCart } from "@/lib/features/carts/cartsSlice";
import { productPath } from "@/lib/site";
import { useProductPreview } from "@/components/ProductPreviewContext";
import {
  BUNDLES,
  calcSavings,
  calcUnitPrice,
  getBundlePriceEur,
  formatPriceEur,
} from "@/lib/bundles";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type ProductCardProps = {
  data: Product;
};

type StockStatus = {
  text: string;
  variant: "lowstock" | "destructive";
};

/* ------------------------------------------------------------------ */
/*  SPRING CONFIGS                                                     */
/* ------------------------------------------------------------------ */

const SPRING_LIFT = {
  type: "spring" as const,
  stiffness: 350,
  damping: 25,
  mass: 0.6,
};

const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 500,
  damping: 28,
  mass: 0.8,
};

const SPRING_BOUNCE = {
  type: "spring" as const,
  stiffness: 600,
  damping: 15,
  mass: 0.6,
};

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

const ProductCard = ({ data }: ProductCardProps) => {
  const dispatch = useAppDispatch();
  const { openPreview } = useProductPreview();

  /* --- local state --- */
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [selectedPackIdx, setSelectedPackIdx] = useState(1); // default: 2 packs (most popular)

  const selectedBundle = BUNDLES[selectedPackIdx];

  /* --- computed gallery (main + up to 3 extras) --- */
  const images = useMemo(() => {
    const base = [data.srcUrl];
    if (data.gallery?.length) base.push(...data.gallery);
    return base.slice(0, 4);
  }, [data.srcUrl, data.gallery]);

  /* --- price logic --- */
  const bundlePrice = getBundlePriceEur(selectedBundle);
  const savings = calcSavings(selectedBundle);
  const unitPrice = calcUnitPrice(selectedBundle);

  /* --- stock indicator --- */
  const stockStatus: StockStatus | null = useMemo(() => {
    if (!data.stock || data.stock >= 10) return null;
    if (data.stock <= 2) {
      return { text: `Solo ${data.stock} left`, variant: "destructive" };
    }
    return { text: "Low stock", variant: "lowstock" };
  }, [data.stock]);

  /* --- badge label --- */
  const badgeLabel = useMemo(() => {
    if (!data.badge) return null;
    if (data.badge === "sale") {
      if (data.discount.percentage > 0) return `-${data.discount.percentage}%`;
      if (data.discount.amount > 0) return `-${data.discount.amount}€`;
      return "Sale";
    }
    if (data.badge === "trending") return "Trending";
    if (data.badge === "new") return "New";
    return null;
  }, [data.badge, data.discount]);

  /* --- add to cart handler --- */
  const handleAddToCart = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      dispatch(
        addToCart({
          id: data.id,
          name: `${data.title} — ${selectedBundle.name}`,
          srcUrl: data.srcUrl,
          price: bundlePrice,
          attributes: [selectedBundle.name],
          discount: { amount: 0, percentage: 0 },
          quantity: 1,
        })
      );
    },
    [dispatch, data, selectedBundle, bundlePrice]
  );

  /* --- wishlist toggle --- */
  const toggleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted((prev) => !prev);
  }, []);

  /* --- image that renders inside the card --- */
  const activeImage = isHovered ? images[previewIndex] : data.srcUrl;

  const productSlug = productPath(data.id, data.title);

  return (
    <motion.div
      className="group relative flex flex-col items-start aspect-auto cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setPreviewIndex(0);
      }}
      whileHover={{ y: -6 }}
      transition={SPRING_LIFT}
      onClick={() => openPreview(data)}
    >
      {/* ============================================================ */}
      {/*  IMAGE AREA                                                  */}
      {/* ============================================================ */}
      <div className="relative bg-[#F0EEED] rounded-[13px] lg:rounded-[20px] w-full aspect-square mb-2.5 xl:mb-4 overflow-hidden">
        {/* Main image */}
        <Link
          href={productSlug}
          className="block w-full h-full"
          onClick={(e) => {
            e.preventDefault();
            openPreview(data);
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeImage}
              initial={{ opacity: 0.6, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.6, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full"
            >
              <Image
                src={activeImage}
                alt={data.title}
                width={400}
                height={400}
                className="w-full h-full object-contain p-4 sm:p-6 transition-transform duration-500 group-hover:scale-105"
                priority
              />
            </motion.div>
          </AnimatePresence>
        </Link>

        {/* ---------- Badges (top-left) ---------- */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          {data.badge && badgeLabel && (
            <Badge
              variant={data.badge}
              className="text-[10px] uppercase tracking-wider px-2.5 py-1"
            >
              {badgeLabel}
            </Badge>
          )}
          {stockStatus && (
            <Badge
              variant={stockStatus.variant}
              className="text-[10px] px-2 py-0.5"
            >
              {stockStatus.text}
            </Badge>
          )}
        </div>

        {/* ---------- Wishlist (top-right) ---------- */}
        <motion.button
          className={cn(
            "absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm",
            "bg-white/90 hover:bg-white text-black/40 hover:text-red-500 transition-colors"
          )}
          onClick={toggleWishlist}
          whileTap={{ scale: 0.75 }}
          transition={SPRING_BOUNCE}
          aria-label={isWishlisted ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors duration-300",
              isWishlisted && "fill-red-500 text-red-500"
            )}
          />
        </motion.button>

        {/* ---------- Hover gallery dots ---------- */}
        <AnimatePresence>
          {isHovered && images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={SPRING_SNAPPY}
              className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-1.5 pointer-events-none"
            >
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === previewIndex
                      ? "bg-white w-4"
                      : "bg-white/50 w-1.5"
                  )}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover image trigger zone (invisible overlay for gallery swap) */}
        {isHovered && images.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 top-1/3 z-10 flex">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="flex-1"
                onMouseEnter={() => setPreviewIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  INFO AREA                                                   */}
      {/* ============================================================ */}
      <div className="w-full space-y-2">
        {/* Title (clickable → preview) */}
        <Link
          href={productSlug}
          className="block"
          onClick={(e) => {
            e.preventDefault();
            openPreview(data);
          }}
        >
          <h3 className="font-bold text-black xl:text-xl line-clamp-1 group-hover:text-brand transition-colors duration-300">
            {data.title}
          </h3>
        </Link>

        {/* ---------- Social proof ---------- */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-end">
            <Rating
              initialValue={data.rating}
              allowFraction
              SVGclassName="inline-block"
              emptyClassName="fill-gray-50"
              size={16}
              readonly
            />
            <span className="text-black text-xs ml-1.5 font-medium">
              {data.rating.toFixed(1)}
            </span>
          </div>

          {data.reviewsCount != null && (
            <span className="text-[11px] text-black/40">
              ({data.reviewsCount} reseñas)
            </span>
          )}

          {data.location && (
            <span className="text-[10px] text-brand font-medium flex items-center gap-0.5">
              <Flame className="w-3 h-3" />
              {data.location}
            </span>
          )}
        </div>

        {/* ---------- Pack Selector ---------- */}
        <div className="pt-1">
          <div className="flex items-center gap-1.5 bg-[#F0F0F0] rounded-full p-1">
            {BUNDLES.map((bundle, idx) => {
              const isActive = selectedPackIdx === idx;
              return (
                <button
                  key={bundle.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedPackIdx(idx);
                  }}
                  className={cn(
                    "flex-1 text-[11px] sm:text-xs font-bold py-1.5 px-1 sm:px-2 rounded-full transition-all duration-200",
                    isActive
                      ? "bg-brand text-white shadow-sm"
                      : "bg-transparent text-black/60 hover:text-black hover:bg-black/5"
                  )}
                >
                  {bundle.id} PACK{bundle.id > 1 ? "S" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- Price & Savings ---------- */}
        <div className="pt-0.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPackIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-black text-xl xl:text-2xl">
                  €{formatPriceEur(bundlePrice)}
                </span>

                {savings > 0 && (
                  <span className="font-bold text-black/40 line-through text-base xl:text-lg">
                    €{formatPriceEur(29.99 * selectedBundle.id)}
                  </span>
                )}

                {savings > 0 && (
                  <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-[#FF3333]/10 text-[#FF3333]">
                    -€{formatPriceEur(savings)}
                  </span>
                )}
              </div>

              {savings > 0 ? (
                <span className="text-xs font-semibold text-brand">
                  Ahorras €{formatPriceEur(savings)}
                </span>
              ) : (
                <span className="text-xs text-black/40">Precio base</span>
              )}

              <span className="text-[11px] text-black/50">
                {formatPriceEur(unitPrice)} € / unidad
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---------- Actions ---------- */}
        <div className="pt-1 space-y-2">
          <motion.div
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
          >
            <Button
              onClick={handleAddToCart}
              className="w-full rounded-full font-bold h-11 shadow-[0_4px_14px_rgba(72,125,38,0.35)] transition-all bg-brand hover:bg-brand-hover text-white"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Añadir {selectedBundle.name}
            </Button>
          </motion.div>

          <Link
            href={productSlug}
            className="flex items-center justify-center gap-1 text-xs text-black/50 hover:text-brand font-medium transition-colors hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver producto completo
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
