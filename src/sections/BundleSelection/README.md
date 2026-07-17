# BundleSelection 🟡

Selector de packs (1/2/3 botes) con tarjetas grandes, badge "MÁS POPULAR",
precio tachado, ahorro y precio por unidad. Selección por defecto: bundle 2.

Sin props: el contenido sale de `BUNDLES` (`@/lib/bundles`) y los títulos de
`./data.ts`.

## Contrato de datos (🟡 acoplado al negocio actual)

- **`BUNDLES` de `@/lib/bundles`** — catálogo de packs con `priceInCents`.
  Es el espejo cliente de la tabla `bundles` de Supabase: el precio que se
  cobra se verifica SIEMPRE en servidor contra `bundles.precio`
  (create-payment-intent rechaza el pago si mock y BD divergen). Al reutilizar:
  sustituir `@/lib/bundles` por el catálogo propio.
- **`localStorage["selectedBundle"]`** (clave en `./data.ts`) — persiste
  `{ id }` en cada selección. La leen `CheckoutActions` y
  `checkout/OrderSummary` (`getStoredBundle()`) para saber qué se compra.
  Es el canal de comunicación con el CTA de compra: si se renombra la clave,
  actualizar ambos lectores.

## Dependencias externas

`@/lib/bundles` (BUNDLES + helpers de precio), `localStorage`. Sin Redux,
sin fetch, sin tracking propios.

## Uso

```tsx
import BundleSelection from "@/sections/BundleSelection";
<BundleSelection />
```
