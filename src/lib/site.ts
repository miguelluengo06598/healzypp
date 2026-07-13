// ─────────────────────────────────────────────────────────────────────────────
// Identidad del sitio y URLs canónicas — compartido entre sitemap, robots,
// generateMetadata y los componentes que enlazan a páginas de producto.
// Sin "use client"/"use server" para que sea importable desde ambos contextos.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE_NAME = "HEALZYP";

/** Dominio canónico de producción; sobreescribible por entorno (previews). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://healzyp.com"
).replace(/\/+$/, "");

/**
 * Slug SEO-safe: minúsculas, sin acentos/tildes (NFD + strip de diacríticos),
 * solo [a-z0-9] y guiones, sin guiones al inicio/final.
 * "Gominolas de vinagre de manzana" → "gominolas-de-vinagre-de-manzana"
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ruta canónica de una página de producto: /shop/product/<id>/<slug> */
export function productPath(id: number | string, title: string): string {
  return `/shop/product/${id}/${slugify(title)}`;
}
