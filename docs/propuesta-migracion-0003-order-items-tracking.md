# Migración PROPUESTA (no aplicada): insert atómico de order_items + order_tracking

Estado: **propuesta, pendiente de revisión en su propia sesión — NO aplicada en
Supabase, NO usada por el código actual.**

Fecha: 2026-07-15 (Fase 3, FIX 4). El archivo SQL ya vive en el repo en
`supabase/migrations/0003_order_item_and_tracking_atomic.sql` y se mantiene
como referencia para cuando se decida abordar esto, pero **`createOrder()` en
`src/lib/db/orders.ts` NO la usa** — esa función sigue insertando
`order_items` y `order_tracking` de forma secuencial, exactamente como antes
de la Fase 3, sin `Promise.all` ni `db.rpc()` para esta parte.

## Por qué existe esta migración si no se usa

Al analizar la paralelización de `createOrder()` (Fase 3, FIX 4), se propuso
inicialmente `Promise.all` también para `order_items` + `order_tracking`
(no solo para bundle/producto/perfil/número de pedido). Se construyó un test
reproducible (`verify-fix4-race.js`, ver más abajo) que demostró un defecto
real en ese diseño concreto.

## Escenario de fallo exacto, reproducido

Con `Promise.all([insert order_items, insert order_tracking])`:

1. Ambas peticiones HTTP se disparan a la vez.
2. El insert de `order_tracking` está envuelto en un `try/catch` interno que
   se traga cualquier error (solo hace `console.warn`) — nunca hace que la
   función falle.
3. Si el insert de `order_items` falla con una **excepción de red lanzada**
   (no un `{error}` devuelto con calma por PostgREST — confirmado en esta
   sesión que Supabase inalcanzable produce justo ese patrón: excepciones
   `TypeError: fetch failed`, no errores controlados), esa excepción se
   propaga y hace que `Promise.all` rechace.
4. Para ese momento, `order_tracking` ya se ha insertado con éxito de forma
   independiente (paso 2 ya se completó antes de que el paso 3 fallara).
5. Resultado: la fila de `order_tracking` queda escrita, la de `order_items`
   no, y `createOrder()` devuelve `{success: false}` — es decir, la API dice
   que el pedido falló pero en la base de datos queda un registro de
   tracking sin su línea de producto.

Test ejecutado (`verify-fix4-race.js`, contra un cliente Supabase simulado
que reproduce ese patrón de fallo):

```
Secuencial (código actual, sin Promise.all): order_tracking escrito = false, order_items escrito = false
Paralela (Promise.all, la propuesta descartada): order_tracking escrito = true, order_items escrito = false  ← huérfano
```

## Consecuencia real de ese huérfano: el webhook de Stripe

`src/app/api/webhooks/stripe/route.ts` (evento `payment_intent.succeeded`)
lee `order.order_items` para decidir cuánto stock decrementar:

```ts
if (order?.order_items?.length) {
  // ... decrementProductStock() por cada línea ...
}
```

Está protegido con `?.length`, así que no crashea si `order_items` está
vacío. Pero si un pedido queda con tracking y sin items, y ese pedido
**se llega a pagar** (el cliente completa el pago aunque el registro del
pedido en Supabase haya quedado incompleto), el webhook confirma el pago,
**no decrementa stock de ningún producto, y no lo registra como error** —
solo hay alerta cuando el stock es insuficiente para decrementar, no cuando
no hay nada que decrementar. Es un problema de integridad de inventario
silencioso, no un crash visible.

## Qué resuelve la migración propuesta

`insert_order_item_and_tracking()` (función plpgsql) hace ambos `INSERT`
dentro de la misma transacción de Postgres — o entran los dos o ninguno. El
código llamante pasaría de dos peticiones HTTP independientes a una sola
(`db.rpc('insert_order_item_and_tracking', {...})`), eliminando la ventana
de inconsistencia sin coste de latencia adicional frente a la versión con
`Promise.all` descartada (de hecho debería ser más rápida: una petición HTTP
en vez de dos).

## Antes de aplicarla, en su propia sesión

1. Revisar `supabase/migrations/0003_order_item_and_tracking_atomic.sql`
   (tipos de columnas ya verificados contra `supabase/schema.sql`:
   `product_id` es `UUID`, no `INTEGER` — error corregido durante esta
   sesión antes de guardar el archivo).
2. Ejecutarla manualmente en el SQL Editor de Supabase (este proyecto no
   tiene CLI de Supabase ni CI que aplique migraciones automáticamente —
   mismo procedimiento que `0001_stock_decrement.sql` y
   `0002_order_status_fallido.sql`).
3. Solo entonces cambiar `src/lib/db/orders.ts` para usar
   `db.rpc('insert_order_item_and_tracking', {...})` en vez de los dos
   inserts secuenciales actuales.
4. Repetir `verify-fix4-race.js` contra la versión con RPC para confirmar
   que ya no se reproduce el huérfano (esto ya se hizo una vez sobre el
   código, antes de revertirlo a la versión secuencial — el resultado fue
   positivo, pero conviene repetirlo en la sesión que aplique el cambio
   real).
