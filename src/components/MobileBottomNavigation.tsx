"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, ShoppingBag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/hooks/redux";
import { RootState } from "@/lib/store";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { supabase } from "@/lib/supabase";
import { useScrollDirection } from "@/hooks/useScrollDirection";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type NavItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: "cart" | "wishlist";
  action?: "account";
};

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

// "Favoritos" (icon: Heart) se quitó de aquí: apuntaba a /#favoritos, un
// ancla que no existe en ningún sitio — no hay página de wishlist en la app,
// solo el toggle de favorito por producto. Reintroducir cuando exista esa
// página.
const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", icon: Home, href: "/" },
  { label: "Buscar", icon: Search, href: "/shop" },
  { label: "Carrito", icon: ShoppingBag, href: "/cart", badge: "cart" },
  { label: "Cuenta", icon: User, href: "/account/orders", action: "account" },
];

const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 500,
  damping: 32,
  mass: 0.8,
};

const SPRING_SOFT = {
  type: "spring" as const,
  stiffness: 350,
  damping: 28,
};

/* ------------------------------------------------------------------ */
/*  HOOK: wishlist localStorage (reactive)                             */
/* ------------------------------------------------------------------ */

const useWishlistCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("healzyp-wishlist");
        const parsed = raw ? (JSON.parse(raw) as number[]) : [];
        setCount(parsed.length);
      } catch {
        setCount(0);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "healzyp-wishlist") read();
    };
    window.addEventListener("storage", onStorage);
    const interval = setInterval(read, 1000); // fallback polling
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return count;
};

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

const MobileBottomNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { openAuth } = useAuthModal();

  const scrollDir = useScrollDirection();
  const [forceVisible, setForceVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /* --- redux cart count --- */
  const cartQty = useAppSelector(
    (state: RootState) => state.carts.cart?.totalQuantities ?? 0
  );

  /* --- wishlist count --- */
  const wishlistQty = useWishlistCount();

  /* --- auth state --- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* --- visibility logic --- */
  const visible = useMemo(() => {
    if (forceVisible) return true;
    if (scrollDir === "up") return true;
    if (scrollDir === "down") return false;
    return true;
  }, [forceVisible, scrollDir]);

  /* --- auto-clear force visible after interaction --- */
  const triggerVisible = useCallback(() => {
    setForceVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setForceVisible(false), 3000);
  }, []);

  /* --- active state helper --- */
  const isActive = useCallback(
    (item: NavItem) => {
      const { href } = item;
      if (item.action === "account") return pathname.startsWith("/account");
      if (href === "/") return pathname === "/";
      if (href.startsWith("/#")) return false; // hash links not active
      return pathname.startsWith(href);
    },
    [pathname]
  );

  /* --- cleanup --- */
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={SPRING_SOFT}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "md:hidden",
              "bg-white/80 backdrop-blur-xl",
              "border-t border-black/5",
              "shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
            )}
          >
            <div className="max-w-frame mx-auto px-2 h-[72px] flex items-center justify-around">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;

                const badgeCount =
                  item.badge === "cart"
                    ? cartQty
                    : item.badge === "wishlist"
                    ? wishlistQty
                    : 0;

                return (
                  <motion.button
                    key={item.label}
                    onClick={() => {
                      triggerVisible();
                      if (item.action === "account" && !isLoggedIn) {
                        openAuth("login");
                      } else {
                        router.push(item.href);
                      }
                    }}
                    whileTap={{ scale: 0.82 }}
                    transition={SPRING_SNAPPY}
                    className={cn(
                      "relative flex flex-col items-center justify-center",
                      "w-14 h-14 rounded-2xl",
                      "transition-colors duration-200",
                      active
                        ? "text-brand bg-brand/10"
                        : "text-black/40 hover:text-black/70 hover:bg-black/5"
                    )}
                    aria-label={item.label}
                  >
                    {/* Icon */}
                    <div className="relative">
                      <Icon
                        className={cn(
                          "w-6 h-6 transition-transform duration-200",
                          active && "scale-110"
                        )}
                        strokeWidth={active ? 2.5 : 2}
                      />

                      {/* Badge counter */}
                      {badgeCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={SPRING_SNAPPY}
                          className="absolute -top-2 -right-2.5"
                        >
                          <Badge
                            variant="destructive"
                            className="h-4 min-w-[16px] px-1 text-[9px] font-bold flex items-center justify-center border-2 border-white"
                          >
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </Badge>
                        </motion.span>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-[10px] font-medium mt-0.5 leading-none",
                        active ? "text-brand" : "text-black/40"
                      )}
                    >
                      {item.label}
                    </span>

                    {/* Active dot */}
                    {active && (
                      <motion.div
                        layoutId="mobile-nav-indicator"
                        className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-brand"
                        transition={SPRING_SOFT}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Spacer para que no tape contenido en mobile */}
      <div className="block md:hidden h-[72px]" aria-hidden="true" />
    </>
  );
};

export default MobileBottomNavigation;
