# Componentes muertos / UI inalcanzable (Fase 5)

Inventario acumulado de componentes no importados desde ninguna ruta activa,
encontrados accidentalmente mientras se trabajaba en otras fases del audit.

**Inventario completo (39 archivos, vía `knip`) en
`docs/fase5-codigo-muerto-knip.md`** — este documento cubre los 7 hallados a
mano antes de esa herramienta; ese cubre el resto, clasificados
Trivial/Revisar. `MobileBottomNavigation.tsx` (abajo) ya se reconectó, no se
borró.

## Drawer de StickySmartCart: UI muerta sin disparador

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

## Código muerto relacionado (mismo barrido, Fase 3)

Ninguno de estos se importa desde ningún sitio:

- `src/components/product-page/Header/AddToCartBtn.tsx`
- `src/components/product-page/Header/AddToCartBundleBtn.tsx`
- `src/components/InfiniteScrollHybrid.tsx`

Si se opta por eliminar, borrar también estos tres.

## Más código muerto encontrado (Fase 4, accesibilidad)

Al aplicar los fixes de accesibilidad del audit, varios de los archivos y
líneas señalados resultaron ser componentes no alcanzables desde ninguna
ruta activa — mismo patrón que arriba. Se les aplicó igualmente el fix de
accesibilidad pedido (por si se reconectan en el futuro), pero no se pudieron
verificar en navegador real por el mismo motivo: no hay forma de renderizarlos
en la app actual.

- `src/components/product-page/Header/ColorSelection.tsx` — reemplazado por
  `BundleSelection` según comentario en `Header/index.tsx`; nada lo importa.
- `src/components/shop-page/filters/ColorsSection.tsx` (y con él,
  `src/components/shop-page/filters/index.tsx` completo, el sidebar de
  filtros de `/shop`) — nada importa `filters/index.tsx`.
- `src/components/homepage/Header/index.tsx` — la home real usa
  `HeroSectionDynamica` (`src/app/page.tsx`), no este `Header`; nada lo
  importa.
- `src/components/checkout/SecurityBadges.tsx` — no se renderiza en
  `/checkout` ni en ningún otro sitio; nada lo importa.

## Recomendación consolidada para Fase 5

Dado el volumen ya encontrado (7 componentes muertos entre Fase 3 y Fase 4),
antes de decidir "restaurar disparador" vs. "eliminar" caso por caso, vale la
pena un barrido único con una herramienta de detección de exports no usados
(p. ej. `ts-prune` o `knip`) sobre todo `src/components`, en vez de seguir
descubriéndolos uno a uno por accidente mientras se trabaja en otra fase.
