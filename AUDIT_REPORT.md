# Auditoría Healzyp — 2026-06-11

## Resumen ejecutivo

| Categoría | Cantidad |
|-----------|----------|
| 🚨 Crítico | 7 |
| ⚠️ Advertencia | 12 |
| ✅ Correcto | 8 |

**Conclusión:** La tienda compila y el flujo de pedidos COD funciona a nivel básico, pero hay **problemas críticos de schema** entre el código y la base de datos real que provocarán fallos silenciosos o errores 500 en producción (webhook de Stripe, búsqueda de perfiles, imágenes, protección de rutas).

---

## 🚨 CRÍTICO — Rompe funcionalidad

### 1. `STRIPE_WEBHOOK_SECRET` es un placeholder en producción
- **Archivo:** `.env.local` (no versionado, pero activo en el entorno)
- **Valor actual:** `STRIPE_WEBHOOK_SECRET="wh"`
- **Impacto:** El webhook de Stripe en `src/app/api/webhooks/stripe/route.ts:24` valida la firma con `stripe.webhooks.constructEvent`. Con un secret incorrecto, **todos los eventos de Stripe serán rechazados con 400**. Los pagos con tarjeta nunca marcarán el pedido como pagado.
- **Fix:** Sustituir por el secret real del endpoint configurado en https://dashboard.stripe.com/webhooks.

### 2. Columna inexistente en búsqueda de perfiles (`teléfono` vs `telefono`)
- **Archivos:**
  - `src/lib/db/orders.ts:138`
  - `src/lib/db/checkout-orders.ts:55`
- **Código:** `.eq('teléfono', input.customerData.phone)`
- **Schema real:** `supabase/schema.sql:164` define la columna como `telefono` (sin acento).
- **Impacto:** La búsqueda de perfiles existentes **falla silenciosamente** (está en try/catch). Nunca se reutiliza un perfil; cada pedido crea uno nuevo (o intenta) con `user_id` null.

### 3. Inserción en `profiles` sin `id` (PK obligatoria)
- **Archivos:**
  - `src/lib/db/orders.ts:154`
  - `src/lib/db/checkout-orders.ts:71`
- **Código:** `.from('profiles').insert({ nombre, apellidos, 'teléfono': ..., email: ... })`
- **Schema real:** `profiles.id` es `UUID PRIMARY KEY REFERENCES auth.users(id)` **sin default**.
- **Impacto:** El INSERT falla silenciosamente (try/catch). El pedido se crea igual, pero `orders.user_id` queda `null`. El criterio "Si el usuario está logado, su perfil se encuentra en 'profiles'" **no se cumple**.

### 4. `updateOrderPaymentStatus` actualiza columnas que no existen en `orders`
- **Archivo:** `src/lib/db/orders.ts:312-318`
- **Código:**
  ```ts
  .update({
    payment_status: status,
    paid_at:        status === 'PAID' ? new Date().toISOString() : null,
    status:         status === 'PAID' ? 'CONFIRMED' : 'PENDING',
  } as any)
  ```
- **Schema real:** La tabla `orders` (según `supabase/schema.sql:265-284`) solo tiene:
  `estado`, `subtotal`, `descuento`, `gastos_envio`, `total`, `metodo_pago`, `direccion_envio`, `notas_cliente`, `fecha_creacion`, `fecha_actualizacion`.
  **No existe** `payment_status`, `paid_at`, ni `status`.
- **Impacto:** El webhook de Stripe devuelve **500** al intentar actualizar. Stripe reintentará el webhook indefinidamente. Los pedidos pagados nunca cambiarán de estado en la BD.
- **Fix:** Cambiar el UPDATE para modificar `estado` (ej. `'pendiente'` → `'pagado'`) y añadir columnas `payment_status` / `paid_at` al schema, o adaptar el código al schema existente.

### 5. `next.config.mjs` apunta a bucket de imágenes de Supabase incorrecto
- **Archivo:** `next.config.mjs:23-28`
- **Configuración actual:**
  ```js
  hostname: "achzefxiylozwnuglvyz.supabase.co"
  ```
- **Proyecto real:** `NEXT_PUBLIC_SUPABASE_URL="https://ahxfrlbookvbszrnclpq.supabase.co"` (`.env.local`)
- **Impacto:** Las imágenes alojadas en Supabase Storage **no cargarán** en producción (Next.js rechazará el dominio).
- **Fix:** Sincronizar el `hostname` con el proyecto real.

### 6. Rutas `/account/*` no están protegidas
- **Archivo:** `src/app/account/layout.tsx`
- **Impacto:** Cualquier usuario (logado o no) puede navegar a `/account/orders`, `/account/profile`, `/account/coupons`. Aunque `profile/page.tsx` muestra datos vacíos, no hay redirección al login.
- **Fix:** Añadir un Server Component o middleware que verifique la sesión de Supabase y redirija a `/` o `/login` si no existe.

### 7. Flujos de bundle (`/checkout/cod` y `/checkout/card`) no redirigen a confirmación
- **Archivos:**
  - `src/app/checkout/cod/page.tsx:176-214` (pantalla inline)
  - `src/app/checkout/card/page.tsx:426-464` (pantalla inline)
- **Impacto:** El usuario que compra un bundle ve una pantalla de éxito en la misma URL, pero **no se guarda nada en `sessionStorage`**. Si recarga, pierde la confirmación. Además, la página `/order/confirmation` (que lee `sessionStorage`) solo funciona para el flujo de carrito (`/checkout`).
- **Fix:** Escribir los datos del pedido en `sessionStorage` y hacer `router.push("/order/confirmation")` tras el éxito.

---

## ⚠️ ADVERTENCIA — Puede causar problemas

### 8. `database.types.ts` completamente desactualizado
- **Archivo:** `src/types/database.types.ts`
- **Problema:** Los tipos definen `customers`, `orders` con columnas antiguas (`customer_id: number`, `shipping_name`, `shipping_phone`, etc.) que no coinciden con `supabase/schema.sql`.
- **Impacto:** El proyecto compila porque se usa `as any` masivamente, pero se pierde la seguridad de tipos. Cualquier refactor futuro puede romper la app.
- **Fix:** Regenerar los tipos con `npx supabase gen types typescript --project-id <id>`.

### 9. No se inserta historial en `order_tracking`
- **Archivo:** `src/lib/db/orders.ts`
- **Schema:** Existe `order_tracking` (`supabase/schema.sql:310-318`) con `estado`, `descripcion`, `fecha_creacion`.
- **Impacto:** Al crear un pedido no se registra el estado inicial. El panel de admin no tendrá trazabilidad.
- **Fix:** Tras insertar en `orders`, hacer un INSERT en `order_tracking` con `estado: 'pendiente'`.

### 10. PaymentIntent huérfanos al recargar `/checkout/card`
- **Archivo:** `src/app/checkout/card/page.tsx:895-913`
- **Problema:** Cada vez que el usuario entra o recarga la página, se crea un nuevo PaymentIntent vía `/api/create-payment-intent`. El anterior no se cancela.
- **Impacto:** Acumulación de PIs abandonados en Stripe. Límite de 10,000 PIs no capturados en modo test (menor en live).
- **Fix:** Guardar `paymentIntentId` en `sessionStorage` y reutilizarlo, o cancelar el anterior al desmontar.

### 11. `Elements` sin `clientSecret` en flujo de carrito
- **Archivo:** `src/app/checkout/page.tsx:212`
- **Código:** `<Elements stripe={stripePromise}>`
- **Problema:** `PaymentSection` usa `CardNumberElement` + `createPaymentMethod` (flujo manual). Esto funciona, pero es un patrón legacy. Stripe recomienda `PaymentElement` con `clientSecret`.
- **Impacto:** Posibles warnings en consola de Stripe. Menor soporte para wallets locales.

### 12. `src/app/checkout/page.tsx` no usa `options={{ clientSecret }}` en Elements
- **Relacionado con #11.** El `clientSecret` se obtiene en `handlePaymentSubmit` (después de hacer fetch a `/api/checkout/create-payment-intent`), no al montar el componente. Esto es funcional pero subóptimo para UX (el botón de pago puede tardar en habilitarse).

### 13. Faltan variables Pushover en `.env.local`
- **Archivo:** `.env.local`
- **Problema:** `PUSHOVER_USER_KEY` y `PUSHOVER_API_TOKEN` no están definidas (solo existen en `.env.local.example`).
- **Impacto:** Las notificaciones Pushover se envían silenciosamente sin error (`sendPushover` loggea warning y retorna), pero el usuario no recibe push en el móvil.

### 14. `hCaptcha` configurado pero no utilizado
- **Archivo:** `.env.local.example` (líneas de hCaptcha)
- **Problema:** Las claves de hCaptcha están en el example, pero no hay ningún componente ni API route que valide hCaptcha.
- **Impacto:** Recurso técnico muerto. Si se añade en el futuro, hay que recordar configurarlo.

### 15. Duplicación de API route de PaymentIntent
- **Archivos:**
  - `src/app/api/create-payment-intent/route.ts` (flujo bundle)
  - `src/app/api/checkout/create-payment-intent/route.ts` (flujo carrito)
- **Problema:** Dos endpoints muy similares que calculan precios y crean PIs. Mantener ambos aumenta el riesgo de divergencia (descuentos, shipping, etc.).
- **Recomendación:** Consolidar en uno solo o renombrar para claridad.

### 16. Falta sanitización de inputs antes de guardar en Supabase
- **Archivos:** Todos los formularios (checkout, contacto, auth)
- **Problema:** Zod valida formato, pero no escapa HTML/JS (XSS). Si un admin muestra `nombre_cliente` o `notas_cliente` sin sanitizar en un panel futuro, hay riesgo de stored XSS.
- **Fix:** Añadir DOMPurify en el servidor antes de inserts, o al menos sanitizar en el frontend de admin.

### 17. No hay timeout configurado para queries de Supabase
- **Archivo:** `src/lib/supabase.ts`
- **Problema:** Si Supabase tarda más de 10s (límite de Vercel Serverless), la Server Action o API Route fallará con un error opaco para el usuario.
- **Fix:** Añadir `db.rpc('...', {}, { head: false, timeout: 8000 })` o envolver en `Promise.race` con timeout.

### 18. Carrito en `localStorage` sin firma/encriptación
- **Archivos:** `src/lib/features/carts/cartsSlice.ts`, `src/hooks/useCheckout.ts`
- **Problema:** Un usuario puede manipular `localStorage` para cambiar IDs o cantidades. Aunque `/api/checkout/create-payment-intent` recalcula precios en servidor, el flujo bundle (`/checkout/cod`, `/checkout/card`) lee el bundle de `localStorage`.
- **Mitigación:** El bundle se valida contra `BUNDLES` estático y Zod restringe `bundleId` a 1-3, por lo que el precio no puede manipularse. Riesgo bajo, pero existe.

### 19. `AuthModal.tsx` no tiene rate limiting de frontend
- **Archivo:** `src/components/auth/AuthModal.tsx`
- **Problema:** Un bot puede spammear login/register desde el cliente. Supabase tiene rate limiting propio, pero el frontend no muestra loading ni bloquea tras N intentos fallidos.

---

## ✅ CORRECTO

1. **TypeScript limpio:** `npx tsc --noEmit` pasa sin errores.
2. **Build exitoso:** `npm run build` completa la generación estática sin fallos.
3. **`stripePromise` a nivel de módulo:** `src/lib/stripe.ts:6` exporta `loadStripe` fuera de componentes. No se recrea en cada render.
4. **Webhook valida firma:** `src/app/api/webhooks/stripe/route.ts:24` usa `stripe.webhooks.constructEvent` antes de procesar cualquier evento.
5. **Precio calculado en servidor:** `/api/create-payment-intent/route.ts:64-69` calcula `amountCents` desde `BUNDLES` estático, nunca confía en el cliente.
6. **Rate limiting implementado:** Upstash Redis limita IPs y teléfonos en `createOrderAction`, `/api/create-payment-intent`, etc.
7. **Mapbox autocomplete integrado:** Todos los `AddressAutofill` tienen `popoverOptions` y CSS de z-index para evitar quedar detrás de modales.
8. **No hay secrets hardcodeados:** Búsqueda de `sk_live`, `service_role`, etc. solo arroja lecturas de `process.env`.
9. **Imágenes con `<Image>`:** No se encontraron tags `<img` en `src/`. Todas las imágenes usan `next/image` con `fill` + `sizes`.
10. **Honeypot anti-bot:** Presente en `checkout/cod`, `checkout/card` y `CheckoutModal`.

---

## 🛠️ Plan de acción priorizado

### Inmediato (antes del próximo deploy)

| # | Tarea | Archivo(s) | Est. |
|---|-------|------------|------|
| 1 | **Corregir `STRIPE_WEBHOOK_SECRET`** en `.env.local` con el valor real de Stripe Dashboard | `.env.local` | XS |
| 2 | **Corregir columna `teléfono` → `telefono`** en ambos servicios de DB | `src/lib/db/orders.ts:138`, `src/lib/db/checkout-orders.ts:55` | XS |
| 3 | **Arreglar `updateOrderPaymentStatus`** para usar columnas reales (`estado`) o migrar schema | `src/lib/db/orders.ts:306-318` | S |
| 4 | **Arreglar inserción en `profiles`** para usar `id` UUID del usuario logado (o saltarse el upsert si es guest) | `src/lib/db/orders.ts:128-173` | S |
| 5 | **Sincronizar `next.config.mjs`** con el bucket de Supabase real | `next.config.mjs:23-28` | XS |
| 6 | **Añadir protección de auth** en `/account/*` (redirigir si no hay sesión) | `src/app/account/layout.tsx` o `middleware.ts` | S |

### Corto plazo (esta semana)

| # | Tarea | Archivo(s) | Est. |
|---|-------|------------|------|
| 7 | **Regenerar `database.types.ts`** desde Supabase para que coincida con el schema real | `src/types/database.types.ts` | M |
| 8 | **Escribir en `sessionStorage` y redirigir** en flujos COD y tarjeta de bundle | `src/app/checkout/cod/page.tsx`, `src/app/checkout/card/page.tsx` | S |
| 9 | **Insertar historial inicial** en `order_tracking` al crear pedido | `src/lib/db/orders.ts` | XS |
| 10 | **Añadir `PUSHOVER_USER_KEY` y `PUSHOVER_API_TOKEN`** a `.env.local` | `.env.local` | XS |
| 11 | **Cancelar/reutilizar PaymentIntent** al recargar `/checkout/card` | `src/app/checkout/card/page.tsx` | S |
| 12 | **Añadir timeout explícito** a llamadas críticas de Supabase | `src/lib/db/orders.ts`, `src/lib/db/checkout-orders.ts` | S |

### Medio plazo (próximo sprint)

| # | Tarea | Archivo(s) | Est. |
|---|-------|------------|------|
| 13 | **Consolidar** `/api/create-payment-intent` y `/api/checkout/create-payment-intent` | API routes | M |
| 14 | **Migrar flujo de carrito** a `PaymentElement` con `clientSecret` upfront | `src/app/checkout/page.tsx`, `PaymentSection.tsx` | M |
| 15 | **Añadir sanitización XSS** en inputs de texto antes de inserts | Server Actions / DB layer | S |
| 16 | **Implementar hCaptcha** o eliminar variables si no se va a usar | `.env.local.example`, formularios | S |
| 17 | **Refactorizar `CheckoutModal.tsx`** (1260 líneas) en sub-componentes | `src/components/checkout/CheckoutModal.tsx` | L |
