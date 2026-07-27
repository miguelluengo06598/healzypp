# Hero

Hero de la home: badge, titular con highlight, descripción, 2 CTAs, stats
animados, imagen de producto con badges flotantes de cristal y mini-card
"más vendido" con parallax por scroll.

## Archivos

- `index.tsx` — el componente (client, framer-motion)
- `types.ts` — `HeroProps` (todas las props opcionales)
- `data.ts` — **el punto de adaptación**: contenido por defecto de la tienda.
  Al copiar la sección a otro proyecto, reescribe `data.ts` (o pasa props)
  sin tocar `index.tsx`. Es el único archivo que importa datos del proyecto
  (`@/data/products` para la mini-card).

## Props

Ver `types.ts`: `badgeLabel`, `headline`, `headlineHighlight`, `description`,
`primaryCta`, `secondaryCta`, `stats[]`, `heroImage`, `miniCard`. Sin props →
usa `heroDefaults` de `data.ts`. Los badges flotantes (iconos) son diseño
interno, no props (los iconos no son serializables desde server components).

## Dependencias externas

`Button`, `Badge`, `AnimatedCounter` de `@/components/ui` (copiar), fuente
`integralCF`, imágenes de `/public/images`. Sin store, sin fetch.

## Uso

```tsx
import Hero from "@/sections/Hero";
<Hero />                                  // contenido por defecto (data.ts)
<Hero headline="Otro claim" stats={[…]} /> // override parcial
```
