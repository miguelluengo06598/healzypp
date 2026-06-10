"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  X,
  ArrowRight,
  Truck,
  CreditCard,
  Wallet,
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
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { useAppSelector, useAppDispatch } from "@/lib/hooks/redux";
import { RootState } from "@/lib/store";
import {
  CartItem,
  removeCartItem,
  addToCart,
  remove,
} from "@/lib/features/carts/cartsSlice";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface FloatingCartBarProps {
  onOpenDrawer: () => void;
  onDismiss: () => void;
}

interface MiniCartDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
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

const SPRING_BOUNCE = {
  type: "spring" as const,
  stiffness: 400,
  damping: 18,
  mass: 0.8,
};

/* ------------------------------------------------------------------ */
/*  HOOKS                                                              */
/* ------------------------------------------------------------------ */

/**
 * Detecta dirección del scroll. Umbral de 10px para evitar jitter.
 */
const useScrollDirection = () => {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastY.current;
      if (Math.abs(diff) < 10) return;
      setDirection(diff > 0 ? "down" : "up");
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return direction;
};

/**
 * Hook central del SmartCart.
 * - Muestra al hacer scroll up
 * - Muestra cuando se añade un producto (detecta incremento de totalQuantities)
 * - Auto-oculta tras 5s de inactividad
 * - Mantiene abierto mientras el drawer esté activo
 */
const useSmartCart = () => {
  const [visible, setVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevQty = useRef<number>(0);

  const { cart, totalPrice, adjustedTotalPrice } = useAppSelector(
    (state: RootState) => state.carts
  );
  const qty = cart?.totalQuantities ?? 0;
  const scrollDir = useScrollDirection();
  const pathname = usePathname();

  const hasItems = qty > 0;

  /* --- mostrar --- */
  const show = useCallback(() => {
    if (!hasItems) return;
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
    }, 5000);
  }, [hasItems]);

  /* --- ocultar manual --- */
  const dismiss = useCallback(() => {
    setVisible(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  /* --- scroll up → mostrar --- */
  useEffect(() => {
    if (scrollDir === "up") show();
  }, [scrollDir, show]);

  /* --- add product detectado --- */
  useEffect(() => {
    if (qty > prevQty.current) {
      show();
    }
    prevQty.current = qty;
  }, [qty, show]);

  /* --- intención de compra: páginas de producto --- */
  useEffect(() => {
    if (pathname?.startsWith("/shop/product/")) {
      show();
    }
  }, [pathname, show]);

  /* --- limpieza --- */
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  /* --- mantener visible mientras drawer abierto --- */
  useEffect(() => {
    if (drawerOpen) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setVisible(true);
    } else if (hasItems) {
      show();
    }
  }, [drawerOpen, hasItems, show]);

  return {
    visible,
    drawerOpen,
    setDrawerOpen,
    dismiss,
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
 * ──────────────────────────────────────────────────────────────────
 * Barra simple de progreso hacia envío gratis / meta. Integrada con
 * colores existentes del proyecto.
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
            ? `Te faltan €${remaining.toFixed(0)} para envío gratis`
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
 * ──────────────────────────────────────────────────────────────────
 * Reutiliza Button + framer-motion spring. Flecha animada en hover.
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
          <span className="text-lg">€{Math.round(total)}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </span>
      </Button>
    </motion.div>
  );
};

/**
 * CartItemRow
 * ──────────────────────────────────────────────────────────────────
 * Fila compacta para el MiniCartDrawer. Reutiliza patrones visuales
 * de cart-page/ProductCard pero simplificado.
 */
const CartItemRow: React.FC<{ item: CartItem }> = ({ item }) => {
  const dispatch = useAppDispatch();

  const unitPrice = useMemo(() => {
    if (item.discount.percentage > 0) {
      return Math.round(item.price - (item.price * item.discount.percentage) / 100);
    }
    if (item.discount.amount > 0) {
      return item.price - item.discount.amount;
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
        href={`/shop/product/${item.id}/${item.name.split(" ").join("-")}`}
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
          <span className="text-sm font-bold text-brand">€{unitPrice}</span>
          {item.discount.percentage > 0 && (
            <span className="text-[11px] line-through text-black/40">
              €{item.price}
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
 * ──────────────────────────────────────────────────────────────────
 * Skeleton loader para el mini-cart. Reutiliza estilos de shimmer
 * consistentes con el proyecto.
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
 * ──────────────────────────────────────────────────────────────────
 * Reutiliza Sheet (shadcn/ui) ya existente. Lista compacta de
 * productos + totales + CTAs.
 */
const MiniCartDrawer: React.FC<MiniCartDrawerProps> = ({
  open,
  onOpenChange,
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
                  <span>€{totalPrice.toFixed(0)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-brand">
                    <span>Descuento</span>
                    <span>-€{discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-black/60">
                  <span>Envío</span>
                  <span className="text-brand font-medium">Gratis</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>€{adjustedTotalPrice.toFixed(0)}</span>
                </div>
              </div>

              <AnimatedCheckoutCTA
                total={adjustedTotalPrice}
                onCheckout={() => {
                  onOpenChange(false);
                  router.push("/checkout/cod");
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="rounded-full h-11 text-xs border-black/10 hover:bg-black/5"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/checkout/card");
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  Tarjeta
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full h-11 text-xs border-black/10 hover:bg-black/5"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/cart");
                  }}
                >
                  <Wallet className="w-4 h-4 mr-1.5" />
                  Ver carrito
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

/**
 * FloatingCartBar
 * ──────────────────────────────────────────────────────────────────
 * Barra flotante inferior. Reutiliza Button y estilos del proyecto.
 * NO siempre visible: controlada por AnimatePresence.
 */
const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  onOpenDrawer,
  onDismiss,
}) => {
  const { cart, adjustedTotalPrice } = useAppSelector(
    (state: RootState) => state.carts
  );
  const items = cart?.items ?? [];
  const qty = cart?.totalQuantities ?? 0;
  const firstImage = items[0]?.srcUrl;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={SPRING_BOUNCE}
      className={cn(
        "fixed bottom-4 left-4 right-4 z-40",
        "sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px]"
      )}
    >
      <div
        className={cn(
          "relative bg-white rounded-[20px] border border-black/10 shadow-2xl",
          "px-4 py-3 sm:px-5 sm:py-4",
          "flex items-center gap-3 sm:gap-4"
        )}
      >
        {/* Mini imagen + counter */}
        <button
          onClick={onOpenDrawer}
          className="relative shrink-0 w-11 h-11 rounded-[12px] bg-[#F0EEED] overflow-hidden flex items-center justify-center hover:scale-105 transition-transform"
        >
          {firstImage ? (
            <Image
              src={firstImage}
              alt="Carrito"
              fill
              sizes="44px"
              className="object-contain p-1"
            />
          ) : (
            <ShoppingBag className="w-5 h-5 text-black/40" />
          )}
          <span className="absolute -top-1.5 -right-1.5 bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
            {qty}
          </span>
        </button>

        {/* Texto */}
        <button
          onClick={onOpenDrawer}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-xs text-black/50 truncate">
            {qty} {qty === 1 ? "producto" : "productos"} en tu carrito
          </p>
          <p className="text-base font-bold text-black">
            €{adjustedTotalPrice.toFixed(0)}
          </p>
        </button>

        {/* CTA Checkout */}
        <motion.div whileTap={{ scale: 0.95 }} transition={SPRING_SNAPPY}>
          <Button
            onClick={onOpenDrawer}
            className={cn(
              "rounded-full h-10 px-5 text-sm font-bold",
              "bg-brand hover:bg-brand-hover text-white shadow-lg"
            )}
          >
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            Ver
          </Button>
        </motion.div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="shrink-0 p-1.5 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

/**
 * StickySmartCart
 * ──────────────────────────────────────────────────────────────────
 * Carrito inteligente sticky que aparece en:
 *  - Scroll hacia arriba
 *  - Añadir producto al carrito
 *  - Estar en página de producto (intención de compra)
 *
 * Auto-hide tras 5s. Reutiliza Sheet, Button, Separator y el store
 * Redux existente.
 */
const StickySmartCart: React.FC = () => {
  const {
    visible,
    drawerOpen,
    setDrawerOpen,
    dismiss,
    hasItems,
  } = useSmartCart();

  if (!hasItems) return null;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <FloatingCartBar
            onOpenDrawer={() => setDrawerOpen(true)}
            onDismiss={dismiss}
          />
        )}
      </AnimatePresence>

      <MiniCartDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
};

export default StickySmartCart;
