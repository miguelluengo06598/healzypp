import type { Product } from "@/types/product.types";
import { CATALOG, type CatalogProduct } from "@/data/catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Adaptador de forma — SIN datos propios. Todo viene de src/data/catalog.ts,
// la única fuente de verdad de nombre/precio/imágenes. NO edites precios ni
// nombres aquí: no tendría efecto en lo que se cobra, y quedaría desincroni-
// zado con lo que muestra el resto de la tienda. Edita src/data/catalog.ts.
//
// Mapea TODO el catálogo, no solo el primer producto: estos arrays alimentan
// /shop, la home, generateStaticParams de la ficha, el sitemap y el redirect
// canónico de proxy.ts — si aquí falta un producto, ese producto no existe
// para la tienda aunque esté en catalog.ts.
// ─────────────────────────────────────────────────────────────────────────────

// Adornos de UI por producto (badge, colores, "Popular en Madrid"…). No tienen
// relación con el precio real cobrado, que vive en catalog.ts como
// bundles[].precio y se verifica server-side en los dos endpoints de
// create-payment-intent. Solo hay entrada para los productos que ya los tenían
// definidos a mano; un producto nuevo aparece sin adornos hasta que se le
// añadan aquí a propósito (nada de descuentos inventados por defecto).
const DECORACION_UI: Record<string, Partial<Product>> = {
  "gominolas-vinagre-manzana": {
    discount: { amount: 0, percentage: 20 },
    stock: 3,
    location: "Popular en Madrid",
    badge: "sale",
    colors: [
      { name: "Natural", code: "bg-[#E8DCC4]" },
      { name: "Verde", code: "bg-[#487D26]" },
    ],
  },
};

function toProduct(producto: CatalogProduct): Product {
  return {
    id: producto.id,
    title: producto.nombre,
    srcUrl: producto.imagenes[0],
    gallery: producto.imagenes,
    // Precio de entrada (pack más barato) — solo para mostrar "desde X€".
    price: producto.bundles[0].precio,
    // Sin rating/reviewsCount: los antiguos 4.8/128 eran placeholders inventados.
    // Poblar solo cuando existan reseñas reales.
    discount: { amount: 0, percentage: 0 },
    sizes: producto.bundles.map((b) => b.nombre),
    ...DECORACION_UI[producto.slug],
  };
}

const productos: Product[] = CATALOG.map(toProduct);

export const newArrivalsData: Product[] = productos;
export const topSellingData: Product[] = productos;
export const relatedProductData: Product[] = productos;
