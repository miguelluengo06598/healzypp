"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Product } from "@/types/product.types";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type ProductPreviewContextType = {
  selectedProduct: Product | null;
  isOpen: boolean;
  openPreview: (product: Product) => void;
  closePreview: () => void;
};

/* ------------------------------------------------------------------ */
/*  CONTEXT                                                            */
/* ------------------------------------------------------------------ */

const ProductPreviewContext = createContext<ProductPreviewContextType | null>(
  null
);

export const ProductPreviewProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPreview = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
    setTimeout(() => setSelectedProduct(null), 350);
  }, []);

  return (
    <ProductPreviewContext.Provider
      value={{ selectedProduct, isOpen, openPreview, closePreview }}
    >
      {children}
    </ProductPreviewContext.Provider>
  );
};

export const useProductPreview = (): ProductPreviewContextType => {
  const ctx = useContext(ProductPreviewContext);
  if (!ctx) {
    throw new Error(
      "useProductPreview must be used within ProductPreviewProvider"
    );
  }
  return ctx;
};
