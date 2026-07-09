export type Discount = {
  amount: number;
  percentage: number;
};

export type ProductColor = {
  name: string;
  code: string;
};

export type Product = {
  // ── Campos reales de la tabla `products` (Supabase) ───────────────────────
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  descripcion_corta: string | null;
  precio: number;
  precio_original: number | null;
  imagenes: string[];
  categoria: string | null;
  tags: string[];
  stock: number;
  activo: boolean;
  meta_title: string | null;
  meta_description: string | null;

  // ── Alias de compatibilidad con la UI existente (ProductCard, PhotoSection,
  //    Header, AddToCartBtn) — todos derivados de datos reales, no inventados ──
  title: string; // = nombre
  srcUrl: string; // = imagenes[0] ?? ""
  // TODO: gallery duplica la portada, igual que el mock original — considerar
  // gallery = imagenes.slice(1) en una fase futura si se revisa el componente de galería
  gallery?: string[]; // = imagenes
  price: number; // = precio
  discount: Discount; // calculado de precio vs precio_original

  // ── Placeholders — sin dato real detrás, ningún equivalente en `products` ──
  rating?: number; // sin columna de reviews real; queda undefined (no se inventa una valoración)
  reviewsCount?: number; // sin equivalente real; undefined
  location?: string; // sin equivalente real; undefined
  badge?: "trending" | "new" | "sale" | null; // derivado: "sale" si discount.percentage > 0
  colors?: ProductColor[]; // sin equivalente real; undefined
  sizes?: string[]; // sin equivalente real; undefined
};
