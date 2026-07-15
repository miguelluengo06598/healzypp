# Código muerto detectado por knip (Fase 5, FIX 6)

Fecha: 2026-07-15. Análisis con `npx knip` (instalado con `--no-save`, no queda
en `package.json`) sobre todo `src/`. Complementa el inventario manual de
`docs/deuda-drawer-sticky-cart-muerto.md` — knip encontró 39 archivos sin usar,
mucho más que los 7 hallados a mano hasta ahora (que están todos aquí también,
como cruce de validación).

De esos 39, `src/components/MobileBottomNavigation.tsx` ya se investigó y
**reconectó** en esta misma fase (ver commit "feat: reconectar
MobileBottomNavigation..."). Los 38 restantes se clasifican abajo en dos
grupos. **Ninguno se ha borrado todavía** — el primer commit de limpieza
cubre solo la columna "Trivial"; "Revisar" queda pendiente de que Miguel
decida uno por uno.

## Falsos positivos descartados antes de esta lista

- `eslint`, `eslint-config-next`, `@eslint/eslintrc` (unused devDependencies):
  se usan vía `npm run lint` → `next lint` → `.eslintrc.json`, no por `import`
  de JS — knip no lo detecta pero no son código muerto. No tocar.
- "Unused exports" (44) y "Unused exported types" (63) de knip: en su mayoría
  son piezas sueltas de archivos `ui/*.tsx` de shadcn (`DialogPortal`,
  `SelectGroup`...) — normal usar solo parte de un primitivo shadcn — y tipos
  de `database.types.ts`/`tracking.types.ts` que documentan el schema real.
  No se listan aquí; podarlos no libera peso real y sí pierde valor de
  documentación.
- `postcss-load-config` ("unlisted dependency"): no es código muerto, es lo
  contrario — falta declararla en `package.json`. Fuera de alcance de FIX 6.

## Hallazgo transversal

Buena parte de lo clasificado "Trivial" no es solo "nadie lo usa": es una
**plantilla de e-commerce de ropa** (`DressStyle`, `SizeSelection`,
`ColorSelection` para tallas/colores de prenda) nunca adaptada al catálogo
real (gominolas, un solo SKU), más un **sistema de reseñas con datos
fabricados** (`DUMMY_REVIEWS` con nombres inventados) que ya se corrigió en
otro punto de la app (`CustomerReviews.tsx`, activo, sin ratings falsos —
commit "fix(contenido): sustituir reseñas inventadas...") pero cuyo
predecesor nunca se eliminó.

## Trivial — candidatos al primer commit de limpieza (34)

### Sistema de ficha de producto reemplazado por ProductSections.tsx (4)
- `src/components/product-page/Tabs/index.tsx`
- `src/components/product-page/Tabs/FaqContent.tsx`
- `src/components/product-page/Tabs/ProductDetails.tsx`
- `src/components/product-page/Tabs/ProductDetailsContent.tsx`

Confirmado: `ProductSections.tsx` (el que sí se renderiza en la ficha) trae
todo su contenido inline y no importa nada de `Tabs/`.

### Selectores de prenda reemplazados por BundleSelection (4)
- `src/components/product-page/Header/ColorSelection.tsx`
- `src/components/product-page/Header/SizeSelection.tsx`
- `src/components/product-page/Header/AddToCartBtn.tsx`
- `src/components/product-page/Header/AddToCartBundleBtn.tsx`

### Sidebar de filtros de /shop, nunca montado (7)
- `src/components/shop-page/filters/index.tsx` (el ensamblador — nada lo importa)
- `src/components/shop-page/filters/CategoriesSection.tsx`
- `src/components/shop-page/filters/ColorsSection.tsx`
- `src/components/shop-page/filters/DressStyleSection.tsx`
- `src/components/shop-page/filters/MobileFilters.tsx`
- `src/components/shop-page/filters/PriceSection.tsx`
- `src/components/shop-page/filters/SizeSection.tsx`

### Plantilla de home sin adaptar (3)
- `src/components/homepage/DressStyle/index.tsx`
- `src/components/homepage/DressStyle/DressStyleCard.tsx`
- `src/components/homepage/Header/index.tsx` (la home real usa `HeroSectionDynamica`)

### Reseñas con datos fabricados — predecesor del sistema honesto activo (5)
- `src/components/trust/ReviewsSection.tsx` (usa `DUMMY_REVIEWS`: nombres,
  comentarios y valoraciones inventados)
- `src/components/trust/VerifiedPurchaseBadge.tsx` (solo lo usa `ReviewsSection`)
- `src/components/common/ReviewCard.tsx` (variante distinta, misma familia de datos falsos)
- `src/components/homepage/Reviews/index.tsx` (único consumidor de `ReviewCard.tsx`)
- `src/types/review.types.ts` (tipo `Review`, solo lo usa `ReviewCard.tsx`)

### Tracking duplicado, superseded por TrackingProvider (5)
- `src/components/tracking/CheckoutTracker.tsx`
- `src/components/tracking/ProductTracker.tsx` (distinto de `ProductPageTracker.tsx`,
  ese sí activo; este solo aparece como ejemplo en un README, no en código real)
- `src/hooks/useCartTracker.ts`
- `src/hooks/useProductTracker.ts`

### Navegación duplicada (1)
- `src/components/layout/Navbar/TopNavbar/MenuList.tsx` — el menú móvil real
  (`ResTopNavbar.tsx`) reimplementa la misma lógica (Accordion) inline, sin
  importar este componente.

### Primitivos UI sin consumidor (2)
- `src/components/ui/pagination.tsx`
- `src/components/ui/slider.tsx` (su único consumidor habría sido
  `PriceSection.tsx`, también trivial — de ahí que `@radix-ui/react-slider`
  salga como dependencia sin usar en el análisis de knip)

### Misceláneo (3)
- `src/components/checkout/SecurityBadges.tsx` (ya documentado previamente)
- `src/components/InfiniteScrollHybrid.tsx` (ya documentado previamente)
- `src/lib/dummy-products.ts` (solo lo usa `InfiniteScrollHybrid.tsx`)
- `src/lib/meta-capi.ts` (duplicado huérfano — la ruta activa
  `src/app/api/meta/capi/route.ts` importa de `src/lib/meta/capi.ts`, una
  carpeta distinta, no de este archivo suelto)

## Revisar — con valor real, solo desconectado (4)

**No borrar sin que Miguel lo decida.** A diferencia del resto, estos no son
restos de plantilla ni datos falsos: son honestos, están bien construidos, y
parecen estar esperando a que la pantalla que los alojaría se termine de
construir — mismo patrón que `MobileBottomNavigation.tsx` (ver
`docs/deuda-drawer-sticky-cart-muerto.md`), que resultó ser una reconexión de
una línea, no basura.

- **`src/components/orders/OrderTimeline.tsx`** (796 líneas) — línea de
  tiempo de pedido completa (confirmado → preparado → enviado → entregado,
  con fechas calculadas reales). `src/app/account/orders/page.tsx` hoy es un
  placeholder estático ("Aún no tienes pedidos", sin fetch de datos) — este
  componente parece construido para esa pantalla, no para descartarse.
- **`src/lib/animations/microinteractions.ts`** — dependencia exclusiva de
  `OrderTimeline.tsx`; mismo destino que él.
- **`src/components/trust/DeliveryEstimates.tsx`** — estimación de fecha de
  entrega y umbral de envío gratis, cálculo real (no hardcodeado), sin datos
  falsos. Nunca se conectó a la ficha de producto.
- **`src/components/trust/ReturnPolicySummary.tsx`** — resumen de política de
  devolución configurable (días), mismo patrón honesto. Nunca conectado.

## Plan

1. Primer commit: eliminar solo los 34 "Trivial".
2. Los 4 "Revisar" quedan documentados aquí para que Miguel decida cada uno
   con calma — candidatos naturales para una futura fase de "completar
   /account/orders" y "enriquecer la ficha de producto con trust badges
   honestos", no para Fase 5.
