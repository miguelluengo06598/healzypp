import type { Product } from "@/types/product.types";

export interface ProductHeaderProps {
  data: Product;
  /** Burbujas de beneficios bajo el título (default: contenido HEALZYP de ./data.ts) */
  benefitBubbles?: string[];
}
