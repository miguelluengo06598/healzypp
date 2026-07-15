# Breadcrumbs

Migas de pan de ficha de producto y de carrito. Dos variantes pequeñas, sin
`index.tsx` común — se importan por archivo:

- `BreadcrumbProduct.tsx` — Inicio → Tienda → {título}. Prop: `title: string`.
- `BreadcrumbCart.tsx` — Inicio → Carrito. Sin props.

## Dependencias externas

Primitivo `breadcrumb` de `@/components/ui`. Sin store, sin fetch.

Nota SEO: el JSON-LD BreadcrumbList de la ficha de producto
(`app/shop/product/[...slug]/page.tsx`) debe mantenerse sincronizado con el
breadcrumb visible de `BreadcrumbProduct`.

## Uso

```tsx
import BreadcrumbProduct from "@/sections/Breadcrumbs/BreadcrumbProduct";
<BreadcrumbProduct title={product.title} />
```
