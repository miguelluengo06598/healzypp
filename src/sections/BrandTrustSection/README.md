# BrandTrustSection

Bloque de marca de la home (imagen + claims de la marca). El nombre mostrado
viene de `SITE_NAME` (`@/lib/site`), no está hardcodeado.

## Props

Ninguna — contenido hardcodeado en `index.tsx`. Candidato a props con defaults (Fase 2).

## Dependencias externas

Solo `next/image` y fuente `integralCF` de `@/styles/fonts`. Imágenes en `/public` — copiarlas.

## Uso

```tsx
import BrandTrustSection from "@/sections/BrandTrustSection";
<BrandTrustSection />
```
