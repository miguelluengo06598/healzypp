# ProductHeader 🟡

Buy-box de la ficha de producto: composición de galería (PhotoSection),
título + rating (solo si hay datos reales), burbujas de beneficios,
selector de packs (BundleSelection), timeline de entrega (DeliveryTimeline)
y CTA de compra (CheckoutActions). Grid 1 columna en móvil, 2 en `md+`.

## Props

- `data: Product` — título, rating y datos que consumen la galería y el CTA.
- `benefitBubbles?: string[]` — burbujas bajo el título
  (default: `defaultBenefitBubbles` de `./data.ts`).

## Dependencias externas (heredadas de sus subsecciones)

Es una composición: su acoplamiento es el de sus piezas.

- 🟢 `PhotoSection` — autocontenida.
- 🟡 `BundleSelection` — BUNDLES de `@/lib/bundles` + `localStorage`
  (ver su README).
- 🟢 `DeliveryTimeline` — autocontenida.
- 🔴 `CheckoutActions` — CheckoutModal/Stripe, Meta Pixel, scroll compartido
  con el nav móvil (ver su README).
- `Rating` de `@/components/ui`, fuente `integralCF`.

Al reutilizar en otro proyecto: PhotoSection y DeliveryTimeline viajan tal
cual; BundleSelection necesita su catálogo; CheckoutActions necesita todo el
flujo de checkout o sustituirse por el CTA propio.

## Uso

```tsx
import ProductHeader from "@/sections/ProductHeader";
<ProductHeader data={product} />
```
