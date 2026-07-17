import type { Product } from "@/types/product.types";

// Al copiar a otro proyecto sin ese tipo, basta con:
// { srcUrl: string; gallery?: string[]; title: string }
export interface PhotoSectionProps {
  data: Product;
}
