"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Rating from "@/components/ui/Rating";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { useProductPreview } from "./ProductPreviewContext";
import { useAppDispatch } from "@/lib/hooks/redux";
import { addToCart } from "@/lib/features/carts/cartsSlice";
import { productPath } from "@/lib/site";
import { Product } from "@/types/product.types";
import {
  BUNDLES,
  calcSavings,
  calcDiscountPct,
  calcUnitPrice,
  getBundlePriceEur,
  formatPriceEur,
} from "@/lib/bundles";

/* ------------------------------------------------------------------ */
/*  CONFIG                                                             */
/* ------------------------------------------------------------------ */

const BENEFIT_BUBBLES = [
  "Con vinagre de manzana",
  "100% veganas",
  "Sin azúcares añadidos",
  "Favorece la digestión",
  "Apoya el bienestar",
];

const TRUST_BADGES = [
  { icon: Truck, label: "Envío gratis" },
  { icon: ShieldCheck, label: "Pago seguro" },
  { icon: RotateCcw, label: "30 días devolución" },
];

const SPRING_SOFT = {
  type: "spring" as const,
  stiffness: 350,
  damping: 28,
};

const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
};

/* ------------------------------------------------------------------ */
/*  IMAGE GALLERY (inside modal)                                       */
/* ------------------------------------------------------------------ */

const ModalImageGallery: React.FC<{ product: Product }> = ({ product }) => {
  const images = useMemo(
    () => [product.srcUrl, ...(product.gallery ?? [])].slice(0, 5),
    [product.srcUrl, product.gallery]
  );
  const [selected, setSelected] = useState(0);

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelected((i) => (i === 0 ? images.length - 1 : i - 1));
    },
    [images.length]
  );

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelected((i) => (i === images.length - 1 ? 0 : i + 1));
    },
    [images.length]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Main image — 4:3 en móvil para dejar sitio al contenido de compra */}
      <div className="relative aspect-[4/3] sm:aspect-square bg-[#F0EEED] rounded-[16px] sm:rounded-[20px] overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0.5, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.5, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <Image
              src={images[selected]}
              alt={product.title}
              fill
              className="object-contain p-4 sm:p-6"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            {/* En táctil no hay hover: las flechas van siempre visibles y solo
                en md+ se ocultan hasta el hover */}
            <button
              onClick={goPrev}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbs */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={cn(
                "relative w-14 h-14 sm:w-16 sm:h-16 rounded-[10px] overflow-hidden shrink-0 border-2 transition-all",
                idx === selected
                  ? "border-brand ring-2 ring-brand/20"
                  : "border-transparent hover:border-black/10"
              )}
            >
              <Image
                src={img}
                alt={`${product.title} ${idx + 1}`}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  WISHLIST HOOK (local)                                              */
/* ------------------------------------------------------------------ */

const useWishlistState = (productId: number) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("healzyp-wishlist");
      const list = raw ? (JSON.parse(raw) as number[]) : [];
      setIsWishlisted(list.includes(productId));
    } catch {
      setIsWishlisted(false);
    }
  }, [productId]);

  const toggle = useCallback(() => {
    setIsWishlisted((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem("healzyp-wishlist");
        const list = raw ? (JSON.parse(raw) as number[]) : [];
        const updated = next
          ? [...list, productId]
          : list.filter((id) => id !== productId);
        localStorage.setItem("healzyp-wishlist", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return next;
    });
  }, [productId]);

  return { isWishlisted, toggle };
};

/* ------------------------------------------------------------------ */
/*  MAIN MODAL                                                         */
/* ------------------------------------------------------------------ */

const QuickProductPreviewModal: React.FC = () => {
  const { selectedProduct, isOpen, closePreview } = useProductPreview();
  const dispatch = useAppDispatch();

  /* Bundle state — same as PDP */
  const [selectedBundleIdx, setSelectedBundleIdx] = useState(1); // default 2 packs (popular)

  /* Reset state when product changes */
  useEffect(() => {
    if (selectedProduct) {
      setSelectedBundleIdx(1);
    }
  }, [selectedProduct?.id]);

  /* Wishlist */
  const { isWishlisted, toggle: toggleWishlist } = useWishlistState(
    selectedProduct?.id ?? 0
  );

  /* Selected bundle */
  const selectedBundle = BUNDLES[selectedBundleIdx];
  const bundlePrice = getBundlePriceEur(selectedBundle);
  const savings = calcSavings(selectedBundle);
  const discountPct = calcDiscountPct(selectedBundle);
  const unitPrice = calcUnitPrice(selectedBundle);

  /* Add to cart */
  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;
    dispatch(
      addToCart({
        id: selectedProduct.id,
        name: `${selectedProduct.title} — ${selectedBundle.name}`,
        srcUrl: selectedProduct.srcUrl,
        price: bundlePrice,
        attributes: [selectedBundle.name],
        discount: { amount: 0, percentage: 0 },
        quantity: 1,
      })
    );
    closePreview();
  }, [dispatch, selectedProduct, selectedBundle, bundlePrice, closePreview]);

  if (!selectedProduct) return null;

  const product = selectedProduct;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closePreview()}>
      {/* Móvil: bottom-sheet a ancho completo con cuerpo scrolleable y CTA
          sticky. Desktop (md+): modal centrado de altura fija donde cada
          columna scrollea por su cuenta y la imagen queda siempre a la vista. */}
      <DialogContent
        showClose={false}
        className={cn(
          "w-full max-w-none md:max-w-[min(92vw,48rem)] lg:max-w-4xl",
          "p-0 gap-0 border-none bg-white",
          "self-end md:self-center",
          "rounded-t-[20px] rounded-b-none md:rounded-[24px] md:rounded-b-[24px]",
          "max-h-[92dvh] md:max-h-none md:h-[min(85vh,760px)] md:overflow-hidden",
          "data-[state=open]:slide-in-from-bottom-8 md:data-[state=open]:slide-in-from-bottom-0"
        )}
      >
        <DialogTitle className="sr-only">{product.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Vista rápida del producto {product.title}
        </DialogDescription>

        {/* Close button */}
        <button
          onClick={closePreview}
          className="absolute right-3 top-3 z-50 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-black/60 hover:text-black transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Asa visual del bottom-sheet (solo móvil) */}
        <div className="md:hidden pt-2.5 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-black/15" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 md:h-full min-h-0">
          {/* ---------- LEFT: Image ---------- */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={SPRING_SOFT}
            className="p-4 sm:p-6 bg-[#F8F8F8] md:bg-white md:overflow-y-auto min-h-0"
          >
            <ModalImageGallery product={product} />
          </motion.div>

          {/* ---------- RIGHT: Info ---------- */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING_SOFT, delay: 0.1 }}
            className="p-5 pt-4 sm:p-6 md:p-8 md:pt-8 flex flex-col md:overflow-y-auto min-h-0"
          >
            {/* Badge */}
            {product.badge && (
              <Badge
                variant={product.badge}
                className="w-fit mb-3 text-[10px] uppercase tracking-wider"
              >
                {product.badge === "sale" && product.discount.percentage > 0
                  ? `-${product.discount.percentage}%`
                  : product.badge}
              </Badge>
            )}

            {/* Title */}
            <h2
              className={cn(
                integralCF.className,
                "text-xl sm:text-2xl md:text-[28px] md:leading-[32px] mb-2"
              )}
            >
              {product.title}
            </h2>

            {/* Rating — solo con datos reales (sin placeholder) */}
            {product.rating != null && (
              <div className="flex items-center gap-2 mb-4">
                <Rating
                  initialValue={product.rating}
                  allowFraction
                  SVGclassName="inline-block"
                  emptyClassName="fill-gray-50"
                  size={20}
                  readonly
                />
                <span className="text-sm font-medium text-black">
                  {product.rating.toFixed(1)}
                </span>
                {product.reviewsCount != null && (
                  <span className="text-xs text-black/40">
                    ({product.reviewsCount} reseñas)
                  </span>
                )}
              </div>
            )}

            {/* Benefits */}
            <div className="flex flex-wrap gap-2 mb-5">
              {BENEFIT_BUBBLES.map((benefit) => (
                <span
                  key={benefit}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F4EC] border border-brand/20 text-black/70 text-xs font-medium px-3 py-1.5"
                >
                  <Star className="w-3 h-3 text-brand fill-brand" />
                  {benefit}
                </span>
              ))}
            </div>

            {/* ---------- Bundle Selection ---------- */}
            <div className="mb-5">
              <span className="text-xs font-semibold text-black/60 uppercase tracking-wide block mb-2">
                Elige tu pack
              </span>
              <div className="flex flex-col gap-2">
                {BUNDLES.map((bundle, idx) => {
                  const isSelected = selectedBundleIdx === idx;
                  const bSavings = calcSavings(bundle);
                  const bDiscount = calcDiscountPct(bundle);
                  const bUnitTotal = (29.99 * bundle.id).toFixed(2);

                  return (
                    <motion.button
                      key={bundle.id}
                      type="button"
                      onClick={() => setSelectedBundleIdx(idx)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-[12px] transition-all border-2 text-left",
                        isSelected
                          ? "bg-brand text-white border-brand shadow-[0_4px_14px_rgba(72,125,38,0.25)]"
                          : "bg-[#F7F8F5] text-black border-transparent hover:border-brand/30 hover:bg-[#F0F4EC]"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm flex items-center gap-2">
                          {bundle.name}
                          {bundle.popular && (
                            <span
                              className={cn(
                                "text-[10px] font-bold py-0.5 px-2 rounded-full tracking-wide",
                                isSelected
                                  ? "bg-white/25 text-white"
                                  : "bg-brand text-white"
                              )}
                            >
                              MÁS POPULAR
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-extrabold text-sm">
                            {bundle.price}
                          </span>
                          {bundle.id > 1 && (
                            <span
                              className={cn(
                                "text-[11px] line-through",
                                isSelected ? "text-white/60" : "text-black/40"
                              )}
                            >
                              {bUnitTotal}€
                            </span>
                          )}
                        </div>
                        {bSavings > 0 && (
                          <span
                            className={cn(
                              "text-[11px] font-semibold mt-0.5",
                              isSelected ? "text-white/90" : "text-brand"
                            )}
                          >
                            Ahorras {formatPriceEur(bSavings)}€
                            {bDiscount > 0 && ` (${bDiscount}% dto.)`}
                          </span>
                        )}
                      </div>

                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3",
                          isSelected
                            ? "border-white bg-white"
                            : "border-black/20"
                        )}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-brand" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Price summary */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedBundleIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 mb-5"
              >
                <span className="text-2xl md:text-3xl font-bold text-black">
                  €{formatPriceEur(bundlePrice)}
                </span>
                {savings > 0 && (
                  <span className="text-lg text-black/40 line-through">
                    €{formatPriceEur(29.99 * selectedBundle.id)}
                  </span>
                )}
                {savings > 0 && (
                  <Badge
                    variant="sale"
                    className="text-[10px] px-2 py-0.5"
                  >
                    -{discountPct}%
                  </Badge>
                )}
                <span className="text-xs text-black/50 ml-auto">
                  {formatPriceEur(unitPrice)} €/ud
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Link to full page */}
            <Link
              href={productPath(product.id, product.title)}
              onClick={closePreview}
              className="inline-flex items-center min-h-11 lg:min-h-0 text-sm text-brand font-medium hover:underline mb-2 lg:mb-4 w-fit"
            >
              Ver detalles completos →
            </Link>

            {/* Trust badges */}
            <div className="mt-auto pt-4 border-t border-black/10 flex items-center justify-around">
              {TRUST_BADGES.map((badge) => (
                <div
                  key={badge.label}
                  className="flex flex-col items-center gap-1 text-black/50"
                >
                  <badge.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions — sticky: pegado al borde inferior del sheet en móvil y
                del panel derecho en desktop, siempre a mano sin scroll */}
            <div className="sticky bottom-0 z-10 bg-white -mx-5 px-5 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 pt-3 pb-4 md:pb-2 mt-4 flex items-center gap-3 [box-shadow:0_-10px_16px_-12px_rgba(0,0,0,0.15)]">
              <motion.div
                className="flex-1"
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
              >
                <Button
                  onClick={handleAddToCart}
                  className="w-full h-11 rounded-full font-bold transition-all bg-brand hover:bg-brand-hover text-white shadow-[0_4px_14px_rgba(72,125,38,0.35)]"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Añadir {selectedBundle.name}
                </Button>
              </motion.div>

              <motion.button
                whileTap={{ scale: 0.8 }}
                transition={SPRING_SNAPPY}
                onClick={toggleWishlist}
                className={cn(
                  "w-11 h-11 rounded-full border flex items-center justify-center transition-colors shrink-0",
                  isWishlisted
                    ? "bg-red-50 border-red-200 text-red-500"
                    : "border-black/10 text-black/40 hover:text-red-500 hover:border-red-200"
                )}
                aria-label="Favoritos"
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isWishlisted && "fill-red-500"
                  )}
                />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickProductPreviewModal;
