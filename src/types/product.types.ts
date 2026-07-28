export type Discount = {
  amount: number;
  percentage: number;
};

export type ProductColor = {
  name: string;
  code: string;
};

export type Product = {
  id: number;
  /** Identificador estable del producto en el catálogo (src/data/catalog.ts).
   *  Es lo que necesitan los helpers de bundles para resolver los packs de
   *  ESTE producto y no los del primero del catálogo. */
  slug: string;
  title: string;
  srcUrl: string;
  gallery?: string[];
  price: number;
  discount: Discount;
  /** Opcional: solo poblar con una media calculada de reseñas reales, nunca placeholder */
  rating?: number;
  // Nuevos campos opcionales para ProductCard mejorado
  reviewsCount?: number;
  stock?: number;
  location?: string;
  badge?: "trending" | "new" | "sale" | null;
  colors?: ProductColor[];
  sizes?: string[];
};
