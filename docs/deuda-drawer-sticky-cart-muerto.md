# Drawer de StickySmartCart: UI muerta sin disparador (Fase 5)

Fecha: 2026-07-15 (Fase 3 rendimiento, descubierto al verificar el lazy-load de
CheckoutModal). `src/components/StickySmartCart.tsx` vive en el layout raíz y
renderiza un `MiniCartDrawer` (Sheet con los items del carrito, barra de envío
gratis y CTA "Pagar ahora" → CheckoutModal), pero **nada puede abrirlo**: el
estado `drawerOpen` del hook local `useSmartCart` nace en `useState(false)` y
ningún componente, evento ni contexto llama a `setDrawerOpen(true)`. No hay
barra sticky renderizada, ni CustomEvent, ni botón de navbar conectado —
probablemente el trigger se eliminó en algún refactor.

Consecuencias:

- El drawer y su CheckoutModal son inalcanzables por UI. El único camino vivo
  al CheckoutModal es `CheckoutActions` en la ficha de producto ("Pagar con
  Tarjeta").
- El componente entero (drawer + modal + lógica de carrito asociada) se envía
  en el bundle del layout raíz sin poder usarse. El CheckoutModal ya va
  lazy-loaded tras la Fase 3 (FIX 1), así que el peso muerto restante es el del
  propio drawer.
- Cualquier verificación en navegador de ese flujo es imposible — no
  confundirlo con una regresión al tocar el archivo.

## Opciones para Fase 5

1. **Restaurar un disparador** (barra sticky al hacer scroll con items, o
   conectar el icono del carrito del navbar al drawer en vez de a `/cart`), o
2. **Eliminar el componente** y quedarse con `/cart` + CheckoutActions como
   únicos caminos de compra.

## Código muerto relacionado (mismo barrido)

Ninguno de estos se importa desde ningún sitio:

- `src/components/product-page/Header/AddToCartBtn.tsx`
- `src/components/product-page/Header/AddToCartBundleBtn.tsx`
- `src/components/InfiniteScrollHybrid.tsx`

Si se opta por eliminar, borrar también estos tres.
