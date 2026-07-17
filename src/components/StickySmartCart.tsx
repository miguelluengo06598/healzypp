"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ArrowRight,
  Truck,
  CreditCard,
  Package,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { eurosToCents, centsToEuros } from "@/lib/money";
import { integralCF } from "@/styles/fonts";
import { useAppSelector, useAppDispatch } from "@/lib/hooks/redux";
import { RootState } from "@/lib/store";
import { productPath } from "@/lib/site";
import {
  CartItem,
  removeCartItem,
  addToCart,
  remove,
} from "@/lib/features/carts/cartsSlice";
import dynamic from "next/dynamic";

// Lazy-load: CheckoutModal arrastra Stripe.js y react-hook-form (~100+ KB gzip).
// Con import estático ese peso iba en el bundle inicial de TODAS las páginas
// (StickySmartCart vive en el layout raíz). ssr:false separa el chunk, y el
// gate checkoutMounted (abajo) evita descargarlo hasta que el usuario abre
// el checkout por primera vez.
const CheckoutModal = dynamic(
  () => import("@/components/checkout/CheckoutModal"),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface MiniCartDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenCheckout: () => void;
}

interface AnimatedCheckoutCTAProps {
  total: number;
  onCheckout: () => void;
  disabled?: boolean;
}

interface ProgressShippingBarProps {
  current: number;
  goal?: number;
}

/* ------------------------------------------------------------------ */
/*  SPRING CONFIGS                                                     */
/* ------------------------------------------------------------------ */

const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 450,
  damping: 32,
  mass: 0.9,
};

const SPRING_SOFT = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
};

/* ------------------------------------------------------------------ */
/*  HOOKS                                                              */
/* ------------------------------------------------------------------ */

const useSmartCart = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { cart, totalPrice, adjustedTotalPrice } = useAppSelector(
    (state: RootState) => state.carts
  );
  const qty = cart?.totalQuantities ?? 0;
  const hasItems = qty > 0;

  return {
    drawerOpen,
    setDrawerOpen,
    qty,
    totalPrice,
    adjustedTotalPrice,
    items: cart?.items ?? [],
    hasItems,
  };
};

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                     */
/* ------------------------------------------------------------------ */

/**
 * ProgressShippingBar
 */
const ProgressShippingBar: React.FC<ProgressShippingBarProps> = ({
  current,
  goal = 50,
}) => {
  const pct = Math.min((current / goal) * 100, 100);
  const remaining = Math.max(goal - current, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-black/60">
          <Truck className="w-3.5 h-3.5" />
          {remaining > 0
            ? `Te faltan €${remaining.toFixed(2)} para envío gratis`
            : "¡Envío gratis desbloqueado! 🎉"}
        </span>
        <span className="font-semibold text-brand">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-brand"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={SPRING_SOFT}
        />
      </div>
    </div>
  );
};

/**
 * AnimatedCheckoutCTA
 */
const AnimatedCheckoutCTA: React.FC<AnimatedCheckoutCTAProps> = ({
  total,
  onCheckout,
  disabled,
}) => {
  return (
    <motion.div whileTap={{ scale: 0.97 }} transition={SPRING_SNAPPY}>
      <Button
        onClick={onCheckout}
        disabled={disabled}
        className={cn(
          "w-full rounded-full h-14 text-base font-bold",
          "bg-brand hover:bg-brand-hover text-white",
          "shadow-[0_4px_14px_rgba(72,125,38,0.3)]",
          "flex items-center justify-between px-6 group"
        )}
      >
        <span className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Pagar ahora
        </span>
        <span className="flex items-center gap-2">
          {/* Nunca redondear el total a euros enteros: 49,99€ se mostraba como €50 */}
          <span className="text-lg">€{total.toFixed(2)}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </span>
      </Button>
    </motion.div>
  );
};

/**
 * CartItemRow
 */
const CartItemRow: React.FC<{ item: CartItem }> = ({ item }) => {
  const dispatch = useAppDispatch();

  // En céntimos: el Math.round en euros de antes convertía 49,99€ en 50€
  const unitPrice = useMemo(() => {
    const priceCents = eurosToCents(item.price);
    if (item.discount.percentage > 0) {
      return centsToEuros(Math.round(priceCents * (1 - item.discount.percentage / 100)));
    }
    if (item.discount.amount > 0) {
      return centsToEuros(priceCents - eurosToCents(item.discount.amount));
    }
    return item.price;
  }, [item.discount, item.price]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={SPRING_SOFT}
      className="flex items-center gap-3 py-3"
    >
      <Link
        href={productPath(item.id, item.name)}
        className="relative shrink-0 w-14 h-14 rounded-[10px] bg-[#F0EEED] overflow-hidden"
      >
        <Image
          src={item.srcUrl}
          alt={item.name}
          fill
          sizes="56px"
          className="object-contain p-1"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-black truncate">{item.name}</p>
        <p className="text-[11px] text-black/50">
          {item.attributes.filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-brand">€{unitPrice.toFixed(2)}</span>
          {item.discount.percentage > 0 && (
            <span className="text-[11px] line-through text-black/40">
              €{item.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 bg-[#F0F0F0] rounded-full px-2 py-1">
          <button
            type="button"
            onClick={() =>
              item.quantity === 1
                ? dispatch(
                    remove({
                      id: item.id,
                      attributes: item.attributes,
                      quantity: item.quantity,
                    })
                  )
                : dispatch(
                    removeCartItem({ id: item.id, attributes: item.attributes })
                  )
            }
            className="p-1 hover:text-brand transition-colors"
            aria-label="Quitar uno"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs font-medium w-4 text-center">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              dispatch(
                addToCart({
                  ...item,
                  quantity: 1,
                })
              )
            }
            className="p-1 hover:text-brand transition-colors"
            aria-label="Añadir uno"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            dispatch(
              remove({
                id: item.id,
                attributes: item.attributes,
                quantity: item.quantity,
              })
            )
          }
          className="text-[10px] text-black/40 hover:text-red-600 flex items-center gap-0.5 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Eliminar
        </button>
      </div>
    </motion.div>
  );
};

/**
 * MiniCartSkeleton
 */
const MiniCartSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-[10px] bg-black/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 bg-black/10 rounded" />
            <div className="h-2.5 w-1/3 bg-black/10 rounded" />
          </div>
        </div>
      ))}
      <div className="h-10 w-full bg-black/10 rounded-full mt-4" />
    </div>
  );
};

/**
 * MiniCartDrawer
 */
const MiniCartDrawer: React.FC<MiniCartDrawerProps> = ({
  open,
  onOpenChange,
  onOpenCheckout,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { cart, totalPrice, adjustedTotalPrice } = useAppSelector(
    (state: RootState) => state.carts
  );
  const items = cart?.items ?? [];
  const hasItems = items.length > 0;
  const discount = totalPrice - adjustedTotalPrice;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-white">
        <SheetHeader className="text-left pb-4 border-b border-black/10">
          <SheetTitle
            className={cn(integralCF.className, "text-xl flex items-center gap-2")}
          >
            <ShoppingBag className="w-5 h-5" />
            Tu carrito
            <span className="ml-auto text-sm font-normal text-black/50 font-sans">
              {items.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </SheetTitle>
        </SheetHeader>

        {!hasItems ? (
          <div className="flex-1 flex flex-col items-center justify-center text-black/40 gap-3">
            <Package className="w-12 h-12" />
            <p className="text-sm">Tu carrito está vacío</p>
            <SheetClose asChild>
              <Button
                variant="outline"
                className="rounded-full border-black/20"
                asChild
              >
                <Link href="/shop">Seguir comprando</Link>
              </Button>
            </SheetClose>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-2 -mx-1 px-1">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <CartItemRow key={`${item.id}-${item.attributes.join("-")}`} item={item} />
                ))}
              </AnimatePresence>
            </div>

            <div className="pt-4 border-t border-black/10 space-y-4">
              <ProgressShippingBar current={adjustedTotalPrice} goal={50} />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-black/60">
                  <span>Subtotal</span>
                  <span>€{totalPrice.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-brand">
                    <span>Descuento</span>
                    <span>-€{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-black/60">
                  <span>Envío</span>
                  <span className="text-brand font-medium">Gratis</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>€{adjustedTotalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <AnimatedCheckoutCTA
                  total={adjustedTotalPrice}
                  onCheckout={() => {
                    onOpenChange(false);
                    onOpenCheckout();
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full rounded-full h-11 text-xs border-black/10 hover:bg-black/5"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/cart");
                  }}
                >
                  Ver carrito completo
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

const StickySmartCart: React.FC = () => {
  const { drawerOpen, setDrawerOpen, hasItems } = useSmartCart();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // true tras la primera apertura y ya no vuelve a false: el chunk del modal
  // solo se descarga entonces, y mantenerlo montado conserva la animación de
  // cierre y el caché de clientSecret entre aperturas.
  const [checkoutMounted, setCheckoutMounted] = useState(false);

  if (!hasItems) return null;

  return (
    <>
      <MiniCartDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onOpenCheckout={() => {
          setCheckoutMounted(true);
          setCheckoutOpen(true);
        }}
      />

      {checkoutMounted && (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
        />
      )}
    </>
  );
};

export default StickySmartCart;
