# Dependencias del catálogo estático a actualizar al migrar a Supabase

Fecha: 2026-07-13 (Fase 2 SEO). El catálogo vive hoy en datos estáticos
(`src/data/products.ts`, 1 producto) y los precios verificados en
`src/lib/bundles.ts`. La Fase 2 creó varios artefactos SEO que leen de ahí y
que deben migrarse EN BLOQUE cuando el catálogo pase a Supabase — migrar solo
una parte crea inconsistencias, y en un caso un bucle de redirects.

## Afectados (migrar todos a la vez)

1. **`src/proxy.ts` (middleware, redirect canónico 301)** — el más crítico.
   Importa `newArrivalsData` + `productPath`. Si la página de producto migra a
   títulos de Supabase y el middleware sigue con el mock, un cambio de título
   produce un BUCLE de redirects (middleware → slug viejo, página → slug
   nuevo). Nota: el middleware corre en edge runtime — no puede hacer query a
   Supabase por request de forma barata; valorar generar un mapa id→slug en
   build, o mover el redirect a la página cuando el streaming de Next permita
   controlar el status (o aceptar el redirect client-side).

2. **`src/app/sitemap.ts`** — genera las URLs de producto desde
   `newArrivalsData`/`topSellingData`. Productos solo en Supabase no saldrían
   en el sitemap (degradación silenciosa). Está preparado para volverse async
   y leer de Supabase (comentario en el propio archivo).

3. **`src/app/shop/product/[...slug]/page.tsx`** — `generateMetadata`
   (title/description/canonical/OG/Twitter), el JSON-LD Product/BreadcrumbList
   y el `permanentRedirect` de respaldo leen del mock. El precio del JSON-LD
   sale de `BUNDLES` (`src/lib/bundles.ts`), anclado a producción por la
   verificación del checkout (el pago se rechaza si diverge de
   `bundles.precio` en Supabase) — esa garantía debe preservarse o sustituirse
   por lectura directa.

4. **Los 4 componentes con enlaces de producto** (`common/ProductCard`,
   `cart-page/ProductCard`, `StickySmartCart`, `QuickProductPreviewModal`)
   usan `productPath(id, title)` — si el título canónico pasa a venir de
   Supabase (p. ej. columna `slug` propia), `productPath`/`slugify` en
   `src/lib/site.ts` es el único punto a cambiar para los enlaces.

## Modos de fallo si se migra parcialmente

| Escenario | Efecto | Visibilidad |
|---|---|---|
| Producto nuevo solo en Supabase | Sin redirect canónico ni entrada en sitemap | Silencioso |
| Título cambiado en Supabase, middleware con mock | **Bucle de redirects** en la URL del producto | Rotura visible para usuarios |
| Mock borrado en la migración | Error de import en build | Ruidoso (se detecta solo) |

Recomendación: cuando se haga la migración, buscar `newArrivalsData` y
`BUNDLES` en todo `src/` y tratar cada resultado como parte del mismo cambio.
