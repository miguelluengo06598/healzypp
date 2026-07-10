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
  title: string;
  srcUrl: string;
  gallery?: string[];
  price: number;
  discount: Discount;
  rating: number;
  // Nuevos campos opcionales para ProductCard mejorado
  reviewsCount?: number;
  stock?: number;
  location?: string;
  badge?: "trending" | "new" | "sale" | null;
  colors?: ProductColor[];
  sizes?: string[];
};
