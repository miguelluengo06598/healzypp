# PhotoSection

Galería de producto: imagen principal + miniaturas clicables, con alt text
distintivo por foto (accesibilidad, Fase 4 del audit).

## Props

- `data: Product` (de `@/types/product.types`) — usa `data.srcUrl`,
  `data.gallery` y `data.title`.

## Dependencias externas

Solo `next/image` y el tipo `Product`. Al copiar a otro proyecto, llevar el
tipo o sustituirlo por `{ srcUrl: string; gallery?: string[]; title: string }`.
Sin store, sin fetch: autocontenida.

## Uso

```tsx
import PhotoSection from "@/sections/PhotoSection";
<PhotoSection data={product} />
```
