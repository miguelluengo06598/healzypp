import type { Product } from "@/types/product.types";
import { CATALOG } from "@/data/catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Adaptador de forma — SIN datos propios. Todo viene de src/data/catalog.ts,
// la única fuente de verdad de nombre/precio/imágenes. NO edites precios ni
// nombres aquí: no tendría efecto en lo que se cobra, y quedaría desincroni-
// zado con lo que muestra el resto de la tienda. Edita src/data/catalog.ts.
//
// `price`/`stock`(cosmético)/`location`/`colors`/`discount` son adornos de UI
// sin relación con el precio real cobrado (ese vive en catalog.ts como
// `bundles[].precio` y se verifica server-side en los dos endpoints de
// create-payment-intent) — se mantienen aquí tal cual estaban.
// ─────────────────────────────────────────────────────────────────────────────

const catalogProduct = CATALOG[0];

const gominolasProduct: Product = {
  id: catalogProduct.id,
  title: catalogProduct.nombre,
  srcUrl: catalogProduct.imagenes[0],
  gallery: catalogProduct.imagenes,
  // Precio de entrada (pack más barato) — solo para mostrar "desde X€".
  price: catalogProduct.bundles[0].precio,
  discount: { amount: 0, percentage: 20 },
  // Sin rating/reviewsCount: los antiguos 4.8/128 eran placeholders inventados.
  // Poblar solo cuando existan reseñas reales.
  stock: 3,
  location: "Popular en Madrid",
  badge: "sale",
  colors: [
    { name: "Natural", code: "bg-[#E8DCC4]" },
    { name: "Verde", code: "bg-[#487D26]" },
  ],
  sizes: catalogProduct.bundles.map((b) => b.nombre),
};

export const newArrivalsData: Product[] = [gominolasProduct];
export const topSellingData: Product[] = [gominolasProduct];
export const relatedProductData: Product[] = [gominolasProduct];
