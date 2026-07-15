# ProductListSec

Carrusel horizontal de productos con título animado y enlace "Ver Todos".
Sección pura: **no importa ninguna tarjeta de producto** — el llamante inyecta
la suya vía `renderItem`.

## Props

- `title: string`
- `data: Product[]` (tipo de `@/types/product.types` — llevar o sustituir al copiar)
- `viewAllLink?: string`
- `renderItem: (product) => ReactNode` — la tarjeta. En esta tienda:
  `(p) => <ProductCard data={p} />`. Es válido pasar la función desde un
  server component (la sección también es server; no cruza frontera RSC).

## Dependencias externas

Primitivo `Carousel` de `@/components/ui` (embla), fuente `integralCF`,
`framer-motion/client`. Sin store, sin fetch.

## Uso

```tsx
<ProductListSec
  title="Novedades"
  data={products}
  viewAllLink="/shop"
  renderItem={(p) => <MiTarjeta data={p} />}
/>
```
