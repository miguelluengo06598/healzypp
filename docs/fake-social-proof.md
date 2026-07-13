# Pendiente — Social proof inventado visible para clientes reales

Fecha del hallazgo: 2026-07-13 (durante Fase 2 SEO, verificado en captura de
navegador real sobre /shop).

`rating: 4.8` y `reviewsCount: 128` (`src/data/products.ts:17-18`) son valores
inventados renderizados en 3 sitios (`ProductCard`, `QuickProductPreviewModal`,
`Header/index.tsx`). Además, las 6 reseñas en `reviewsData` (líneas 33-77) son
texto placeholder en inglés sobre camisetas, no contenido real del producto —
esto es más grave que el rating, es social proof falso mostrado a clientes
reales.

Pendiente: decidir si se eliminan ambos (rating requiere hacer el campo opcional
en el tipo `Product` y quitar los 3 bloques de render con guard; reviews requiere
sustituir por reseñas reales o quitar la sección) antes de seguir promocionando
la tienda.

Nota relacionada (ya aplicado en Fase 2): estos valores se excluyeron
deliberadamente de la meta description (FIX 2) y del JSON-LD (FIX 3, sin
`aggregateRating`) para no indexar cifras falsas en Google.

Referencias exactas de render:
- `src/components/common/ProductCard.tsx:291-301` (estrellas + 4.8) y `:304-308` ("(128 reseñas)")
- `src/components/QuickProductPreviewModal.tsx:340-352`
- `src/components/product-page/Header/index.tsx:40-48`
- Reseñas placeholder: `src/components/product-page/CustomerReviews.tsx` y `src/components/trust/ReviewsSection.tsx` (consumen `reviewsData`)
