"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/hooks/redux";
import { addToCart } from "@/lib/features/carts/cartsSlice";
import { Product } from "@/types/product.types";
import { BUNDLES, Bundle } from "@/lib/bundles";

interface AddToCartBundleBtnProps {
  data: Product;
}

const AddToCartBundleBtn: React.FC<AddToCartBundleBtnProps> = ({ data }) => {
  const dispatch = useAppDispatch();
  const [selectedBundle, setSelectedBundle] = useState<Bundle>(BUNDLES[1]);

  // Leer bundle de localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem("selectedBundle");
      if (raw) {
        const parsed = JSON.parse(raw) as { id: number };
        const found = BUNDLES.find((b) => b.id === parsed.id);
        if (found) setSelectedBundle(found);
      }
    } catch {
      // ignore
    }
  }, []);

  // Escuchar cambios en localStorage (cuando BundleSelection cambia)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "selectedBundle") {
        try {
          const parsed = JSON.parse(e.newValue ?? "{}") as { id: number };
          const found = BUNDLES.find((b) => b.id === parsed.id);
          if (found) setSelectedBundle(found);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Polling fallback para cambios en la misma pestaña
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem("selectedBundle");
        if (raw) {
          const parsed = JSON.parse(raw) as { id: number };
          const found = BUNDLES.find((b) => b.id === parsed.id);
          if (found && found.id !== selectedBundle.id) {
            setSelectedBundle(found);
          }
        }
      } catch {
        // ignore
      }
    }, 500);
    return () => clearInterval(interval);
  }, [selectedBundle.id]);

  const handleAddToCart = useCallback(() => {
    const bundlePrice = selectedBundle.priceInCents / 100;
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
  }, [dispatch, data, selectedBundle]);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <Button
        type="button"
        onClick={handleAddToCart}
        className="w-full rounded-full h-12 md:h-[52px] text-sm sm:text-base font-bold bg-black hover:bg-black/80 text-white transition-all"
      >
        <ShoppingBag className="w-4 h-4 mr-2" />
        Añadir {selectedBundle.name} al carrito — {selectedBundle.price}
      </Button>
    </motion.div>
  );
};

export default AddToCartBundleBtn;
