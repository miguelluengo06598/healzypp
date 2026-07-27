// ─────────────────────────────────────────────────────────────────────────────
// Identidad de marca de la tienda — ÚNICA fuente de verdad. Todo el código
// (metadata, navbar, footer, notificaciones, páginas legales, Meta Pixel...)
// importa estas constantes en vez de hardcodear el nombre/dominio/email —
// así un comprador de la plantilla personaliza su marca completa cambiando
// solo variables de entorno, sin tocar ningún archivo de código.
// Sin "use client"/"use server" para que sea importable desde ambos contextos.
// ─────────────────────────────────────────────────────────────────────────────

/** Nombre de la tienda, mostrado en navbar/footer/metadata/notificaciones. */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "HEALZYP";

/** Dominio canónico de producción; sobreescribible por entorno (previews). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://healzyp.com"
).replace(/\/+$/, "");

/** Email de contacto público (footer, confirmación de pedido, Meta Pixel). */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hola@healzyp.com";

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
