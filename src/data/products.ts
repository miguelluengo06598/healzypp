import type { Product } from "@/types/product.types";

// TODO: reemplaza srcUrl y gallery con las imágenes reales del producto.
// NOTE: El precio aquí refleja el precio de entrada del pack de 1 bote.
// TODO: conectar con la tabla `products` de Supabase para carga dinámica de precios.
//       No se hace ahora porque requeriría una query async que podría romper el flujo
//       del carrito (Redux) si el esquema de Supabase cambia.
const gominolasProduct: Product = {
  id: 1,
  title: "Gominolas de vinagre de manzana",
  srcUrl: "/images/FL1.png",
  gallery: ["/images/FL1.png", "/images/FL2.png", "/images/FL3.png","/images/FL4.png"],
  // Precio real del pack de 1 bote (sin descuento artificial)
  price: 29,
  discount: { amount: 0, percentage: 20 },
  // Sin rating/reviewsCount: los antiguos 4.8/128 eran placeholders inventados.
  // Poblar solo cuando existan reseñas reales (ver docs/fake-social-proof.md).
  stock: 3,
  location: "Popular en Madrid",
  badge: "sale",
  colors: [
    { name: "Natural", code: "bg-[#E8DCC4]" },
    { name: "Verde", code: "bg-[#487D26]" },
  ],
  sizes: ["1 Bote", "2 Botes", "3 Botes"],
};

export const newArrivalsData: Product[] = [gominolasProduct];
export const topSellingData: Product[] = [gominolasProduct];
export const relatedProductData: Product[] = [gominolasProduct];
