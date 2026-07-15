import type { MetadataRoute } from "next";
import { newArrivalsData, topSellingData } from "@/data/products";
import { SITE_URL, productPath } from "@/lib/site";

// El catálogo vive hoy en datos estáticos en memoria (src/data/products.ts);
// cuando se conecte a Supabase, este mismo archivo puede volverse async y leer
// products (id, nombre, fecha_actualizacion) sin cambiar la forma de salida.

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,            lastModified, changeFrequency: "weekly",  priority: 1 },
    { url: `${SITE_URL}/shop`,        lastModified, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE_URL}/contact`,     lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/terms`,       lastModified, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${SITE_URL}/privacy`,     lastModified, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${SITE_URL}/aviso-legal`, lastModified, changeFrequency: "yearly",  priority: 0.2 },
  ];

  // Dedupe por id — hoy los tres arrays exportan el mismo producto único
  const seen = new Set<number>();
  const productRoutes: MetadataRoute.Sitemap = [...newArrivalsData, ...topSellingData]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map((p) => ({
      url: `${SITE_URL}${productPath(p.id, p.title)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  return [...staticRoutes, ...productRoutes];
}
