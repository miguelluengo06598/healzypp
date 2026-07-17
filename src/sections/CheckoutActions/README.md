# CheckoutActions 🔴

CTA de compra de la ficha de producto: botón "Pagar con Tarjeta" (desktop
inline; en móvil, barra fija que se apila sobre el nav inferior) que abre el
CheckoutModal con el bundle elegido. Es la sección más acoplada al negocio —
reubicada tal cual, sin cambios de comportamiento.

## Props

- `data: Product` — solo para el tracking (id, título, precio del evento).

## Contrato de datos y dependencias (🔴 todas hay que reconectarlas al reutilizar)

- **`CheckoutModal`** (`@/components/checkout/CheckoutModal`, lazy via
  `next/dynamic`) — el flujo de pago completo (Stripe.js, react-hook-form).
  No se descarga hasta el primer clic.
- **`getStoredBundle()`** (`@/components/checkout/OrderSummary`) — lee
  `localStorage["selectedBundle"]` que escribe la sección BundleSelection
  (ver su README). Polling de 500ms para sincronizar cambios de selección.
- **`useMetaPixel`** — dispara `AddToCart` + `InitiateCheckout` al abrir el
  modal.
- **`useScrollDirection`** (`@/hooks/useScrollDirection`) — señal compartida
  con `MobileBottomNavigation` (72px, `z-50`): con el nav visible la barra
  móvil se coloca en `bottom-[72px]`; al bajar scroll, en `bottom-0`.
  Si el proyecto destino no tiene nav inferior, fijar `bottom-0` y quitar
  el hook.

## Uso

```tsx
import CheckoutActions from "@/sections/CheckoutActions";
<CheckoutActions data={product} />
```
