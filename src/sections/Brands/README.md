# Brands

Franja horizontal de logos de marcas/sellos bajo el hero de la home.

## Props

Ninguna — los logos están hardcodeados en `index.tsx`. Candidato a `logos: {src, alt}[]`
por props (Fase 2).

## Dependencias externas

Ninguna (solo `next/image`). Los SVG/PNG de logos viven en `/public` — copiarlos.

## Uso

```tsx
import Brands from "@/sections/Brands";
<Brands />
```
