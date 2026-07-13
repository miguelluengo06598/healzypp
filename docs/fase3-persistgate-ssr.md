# Pendiente Fase 3 — PersistGate bloquea el SSR de toda la app

Fecha del hallazgo: 2026-07-13 (durante Fase 2, FIX 3). Verificado con navegador
real (Playwright + Edge) contra el dev server.

## El problema

`src/app/providers.tsx` envuelve TODO el contenido de la app en un `PersistGate`
de redux-persist con un spinner como `loading`. Como la rehidratación solo ocurre
en cliente, **el servidor renderiza el spinner en lugar del contenido**: el HTML
inicial de cualquier página contiene solo TopBanner + spinner + Footer (los únicos
componentes fuera de `Providers` en `src/app/layout.tsx`).

Consecuencias:
- Crawlers sin JS no ven contenido ninguno (ni el JSON-LD de la Fase 2, FIX 3,
  que hoy se inyecta tras la hidratación — Google lo lee porque ejecuta JS, pero
  es frágil).
- El primer render útil depende por completo de la hidratación del cliente.

## Por qué el fix ingenuo NO funciona (probado y revertido)

Se probó `loading={children}` (misma referencia) para que el servidor renderice
el contenido real. El build pasa y el HTML inicial es correcto, PERO en navegador
real introduce dos regresiones:

1. **Rebote de /checkout a /shop** (regresión funcional, verificada con test A/B
   por stash): `src/app/checkout/page.tsx:32-36` redirige a /shop si
   `checkout.hydrated && cart vacío`. `checkout.hydrated` (de
   `src/hooks/useCheckout.ts:55-77`) solo cubre su propio localStorage
   (`healzyp_checkout`), NO la rehidratación de redux-persist. Sin el gate, la
   página monta con el carrito inicial (vacío), el efecto corre antes del
   REHYDRATE de redux, y expulsa al usuario con carrito lleno.
2. **Hydration mismatches** (errores de React en consola, regenera el árbol en
   cliente): el badge del carrito (`CartBtn`) puede renderizar el contador
   rehidratado antes de que la hidratación termine (servidor: sin badge; cliente:
   badge con N), y hay otro mismatch en el icono de menú del navbar (atributos
   Radix en `<img alt="menu">`).

## Diseño correcto para la Fase 3

1. Quitar el gate global (o `loading={children}`), y además:
2. **Redirect de /checkout**: condicionarlo también a la rehidratación de redux —
   redux-persist expone `state._persist.rehydrated`; el efecto debe ser
   `if (checkout.hydrated && rehydrated && cartVacío) redirect`.
3. **Guard de montaje en los badges**: `CartBtn`
   (`src/components/layout/Navbar/TopNavbar/CartBtn.tsx:10`),
   `MobileBottomNavigation` (`:123-124`) y `StickySmartCart` (`:89-90,321-322`)
   deben renderizar el contador solo tras `useEffect` de montaje (patrón
   `useMounted`), para que servidor y primer render de cliente coincidan siempre.
4. Revisar el mismatch del menú Radix del navbar (independiente del carrito).
5. Verificar en navegador real (no solo build/curl): reload de /cart con items,
   reload de /checkout con items (no debe rebotar), consola sin errores de
   hidratación. Script de referencia usado:
   `browser-test.js` (Playwright + canal msedge; el dev server evita el redirect
   HTTP→HTTPS de `src/proxy.ts:12-20` que sí aplica en `next start` local).

## Inventario de dependencias del estado persistido

- Whitelist de redux-persist: solo `carts` (`src/lib/store.ts:11`).
- Lectores del carrito en primer render: CartBtn, MobileBottomNavigation,
  StickySmartCart, /cart, /checkout.
- Fuera de peligro: CookieBanner (fuera de Providers), wishlist (useState local
  efímero), slice products (no persistido).
