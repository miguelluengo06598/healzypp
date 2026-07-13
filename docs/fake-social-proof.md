# Social proof inventado — estado y pendientes

Fecha del hallazgo: 2026-07-13 (durante Fase 2 SEO, verificado en captura de
navegador real sobre /shop). Actualizado el mismo día tras la limpieza de
reseñas y ratings.

## Resuelto (2026-07-13)

- **30 reseñas falsas en español con badge "Compra verificada"**
  (`src/data/productReviewsData.ts`, eliminado): testimonios inventados con
  nombres completos y afirmaciones de salud ("he perdido un poco de peso",
  "funcionan de verdad"), renderizados en la página de producto por
  `CustomerReviews`. Hallazgo posterior a la nota original — era el caso más
  grave. La sección se sustituyó por "Por qué recomendamos este producto"
  (mismo archivo, `src/components/product-page/CustomerReviews.tsx`), basada
  solo en hechos reales del producto.
- **6 reseñas placeholder en inglés sobre camisetas** (`reviewsData` en
  `src/data/products.ts`, eliminado) y su consumidor
  (`Tabs/ReviewsContent.tsx`, eliminado; la pestaña "Valoraciones y Reseñas"
  se quitó de `Tabs/index.tsx`).
- **`rating: 4.8` y `reviewsCount: 128`** eliminados del mock
  (`src/data/products.ts`); `rating` pasó a opcional en el tipo `Product` y
  los 3 puntos de render (estrellas + "4.8" + "(128 reseñas)") quedaron tras
  guard `!= null` en `common/ProductCard.tsx`, `QuickProductPreviewModal.tsx`
  y `product-page/Header/index.tsx`. Si en el futuro hay reseñas reales, basta
  poblar los campos y los bloques reaparecen.

## Pendiente

- **Health claims en el copy de marketing**
  (`src/components/product-page/ProductSections.tsx:82`): "El vinagre de
  manzana ha sido objeto de numerosos estudios clínicos que avalan sus
  beneficios sobre la glucemia, el colesterol y la microbiota intestinal…".
  Afirmaciones de salud sin respaldo citado, en un complemento alimenticio —
  revisar con la misma prioridad legal que las reseñas falsas (normativa
  europea de health claims, Reglamento 1924/2006, es restrictiva con
  glucemia/colesterol).
- **Código muerto con social proof fabricado** (nadie lo importa; candidato a
  eliminación en Fase 5): `src/components/trust/ReviewsSection.tsx`,
  `src/components/homepage/Reviews/index.tsx` + `src/components/common/ReviewCard.tsx`
  (su único consumidor es el anterior), `src/components/product-page/Tabs/`
  (completo), y `src/lib/dummy-products.ts` (genera ratings/reviewsCount
  aleatorios con `seededRandom`).

Nota relacionada (Fase 2): el rating/reseñas se excluyó deliberadamente de la
meta description (FIX 2) y del JSON-LD (FIX 3, sin `aggregateRating`) para no
indexar cifras falsas en Google.
