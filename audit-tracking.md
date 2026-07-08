# Auditoría de Tracking y Analítica — HEALZYP
**Fecha:** 2026-07-08  
**Scope:** Meta Pixel, CAPI, analytics personalizado, consentimiento, infraestructura de datos  
**Estado:** Solo diagnóstico — ningún archivo modificado

---

## 1. Resumen ejecutivo

| # | Hallazgo crítico |
|---|-----------------|
| 🔴 | **PageView de Meta Pixel NO se dispara en cambios de ruta SPA.** El `fbq('track', 'PageView')` solo se ejecuta una vez al cargar el script (en `MetaPixel.tsx`). Cada navegación interna posterior no registra ningún PageView en Meta. En un e-commerce con App Router, esto supone pérdida masiva de datos de tráfico en Meta Ads Manager. |
| 🔴 | **PageView nunca llega a Conversions API (CAPI).** `trackPageView()` solo llama a `fbq()`, sin `sendCAPI()`. Todos los demás eventos sí tienen doble canal (pixel + CAPI), pero PageView es exclusivamente client-side. |
| 🔴 | **Purchase se envía TRES veces a Meta en pagos con tarjeta.** Browser pixel + browser→`/api/meta/capi` + Stripe webhook generan tres eventos con el mismo `event_id`. Meta deduplica 1 pixel + 1 CAPI, pero no garantiza deduplicar 2 eventos CAPI simultáneos. Resultado probable: Purchase contado doble en servidor. |
| 🟠 | **`fbc` / `fbp` nunca se leen ni envían.** Estas cookies de Meta (click ID y browser ID) son el mecanismo principal de atribución de campañas. El schema del CAPI las admite pero `useMetaPixel.ts` nunca las extrae del browser. Sin ellas, el matching de conversiones se degrada considerablemente (especialmente en Safari/iOS con ITP). |
| 🟠 | **`ViewContent` solo se dispara tras 5 segundos.** Un rebote antes de ese tiempo (muy frecuente en mobile) no genera ningún evento de producto visto en Meta. |

---

## 2. Tabla de eventos del Meta Pixel

| Evento | Archivo | Línea | Pixel (fbq) | CAPI browser-proxy | CAPI servidor | Estado |
|--------|---------|-------|-------------|-------------------|---------------|--------|
| PageView (init) | `src/components/tracking/MetaPixel.tsx` | 53 | ✅ (solo primera carga) | ❌ nunca | ❌ nunca | **ROTO** — no se repite en SPA nav |
| PageView (ruta) | *(no existe)* | — | ❌ no implementado | ❌ | ❌ | **ROTO** — completamente ausente |
| ViewContent | `src/components/tracking/ProductMetaTracker.tsx` | 22 | ✅ (tras 5 s) | ✅ | ❌ | **INCOMPLETO** — delay + sin server-side |
| AddToCart | `src/components/product-page/Header/AddToCardSection.tsx` | 19 | ✅ | ✅ | ❌ | **OK parcial** — sin server-side CAPI |
| AddToCart | `src/components/product-page/Header/CheckoutActions.tsx` | 40 | ✅ | ✅ | ❌ | **DUPLICADO** — dos componentes disparan AddToCart |
| InitiateCheckout | `src/app/checkout/card/page.tsx` | 870 | ✅ | ✅ | ❌ | **INCOMPLETO** — falta `content_type` |
| InitiateCheckout | `src/components/product-page/Header/CheckoutActions.tsx` | 40 | ✅ | ✅ | ❌ | **DUPLICADO** — con AddToCardSection.tsx |
| Purchase (browser) | `src/app/order/confirmation/page.tsx` | 85 | ✅ + eventID | ✅ + eventID | — | OK parcial |
| Purchase (COD) | `src/app/actions/orders.ts` | 78 | — | — | ✅ + eventID | OK |
| Purchase (Stripe) | `src/app/api/webhooks/stripe/route.ts` | 99 | — | — | ✅ + eventID | **DUPLICADO CAPI** — ver §3.1 |

---

## 3. Problemas encontrados

### 3.1 — PageView no rastrea navegación SPA  
**Severidad: ALTA**  
**Archivos:** `src/components/tracking/MetaPixel.tsx:53`, `src/hooks/useMetaPixel.ts:106-111`

El `fbq('init', ...) + fbq('track', 'PageView')` se inyecta dentro del bloque `dangerouslySetInnerHTML` del componente `MetaPixel`. Este código se ejecuta exactamente una vez: cuando el componente se monta por primera vez. Con App Router, el componente no se desmonta al navegar entre rutas; por tanto, las rutas posteriores no generan ningún PageView en Meta.

`trackPageView()` en el hook sí llama a `fbq('track', 'PageView')`, pero **nadie invoca esta función en ningún cambio de pathname**. El hook `usePageTracker` (analytics propio) sí rastrea rutas correctamente vía `usePathname` + `useEffect`, pero **no notifica a Meta**.

**Recomendación:** Crear un componente `MetaPageViewTracker` que use `usePathname` + `useEffect([pathname])` para llamar `trackPageView()` y montarlo en el layout raíz junto a `MetaPixel`.

```tsx
// src/components/tracking/MetaPageViewTracker.tsx
'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useMetaPixel } from '@/hooks/useMetaPixel'

export function MetaPageViewTracker() {
  const pathname = usePathname()
  const { trackPageView } = useMetaPixel()
  useEffect(() => { trackPageView() }, [pathname])
  return null
}
```

---

### 3.2 — PageView nunca llega a CAPI  
**Severidad: ALTA**  
**Archivo:** `src/hooks/useMetaPixel.ts:106-111`

`trackPageView()` solo llama a `fbq()` sin invocar `sendCAPI()`. Esto significa que los PageViews son 100% client-side y desaparecen con cualquier bloqueador de anuncios o ITP de Safari. El resto de eventos (ViewContent, AddToCart, etc.) sí tienen doble canal.

**Recomendación:** Añadir `sendCAPI('PageView', generateEventId(), { event_source_url: window.location.href })` dentro de `trackPageView`.

---

### 3.3 — Triple envío de Purchase a CAPI  
**Severidad: ALTA**  
**Archivos:** `src/app/order/confirmation/page.tsx:85`, `src/hooks/useMetaPixel.ts:154`, `src/app/api/webhooks/stripe/route.ts:99`, `src/app/actions/orders.ts:78`

Para un pago con tarjeta, Meta recibe tres señales del mismo evento Purchase:

1. **Browser pixel** → `fbq('track', 'Purchase', ..., {eventID: 'purchase_X'})` 
2. **Browser → `/api/meta/capi`** → `sendCAPI('Purchase', 'purchase_X', ...)`  
3. **Stripe webhook → `sendPurchaseCAPI(...)`** con `event_id='purchase_X'`

Meta deduplica automáticamente 1 señal browser + 1 señal CAPI con el mismo `event_id`. Sin embargo, **Meta no garantiza deduplicación de dos señales CAPI** (eventos 2 y 3). La documentación de Meta indica que la deduplicación browser↔CAPI es la única que opera sobre `event_id`; entre dos CAPI el comportamiento no está garantizado.

El mismo problema ocurre en COD (sin Stripe webhook, pero con server action en `orders.ts`).

**Recomendación:** Eliminar el envío a `/api/meta/capi` desde el browser para el evento Purchase. El webhook de Stripe (o el server action para COD) es la fuente autoritative. El browser pixel es suficiente para el lado cliente. La deduplicación browser↔webhook CAPI funciona correctamente.

---

### 3.4 — `fbc` y `fbp` nunca se capturan  
**Severidad: ALTA**  
**Archivos:** `src/hooks/useMetaPixel.ts:48-68`, `src/app/api/meta/capi/route.ts:78-79`

El schema del endpoint `/api/meta/capi` acepta los campos `fbc` (Facebook Click ID, cookie `_fbc`) y `fbp` (Facebook Pixel ID, cookie `_fbp`). Estos son los identificadores más importantes para la atribución de clics de campaña.

En `sendCAPI()` (hook línea 48–68), `userData` solo pasa email/phone/nombre/ciudad/zip, **nunca lee `document.cookie` para extraer `_fbc`/`_fbp`**.

Sin `fbc`, Meta no puede atribuir la conversión al anuncio que generó el clic. Esto impacta directamente en el ROAS reportado y en la optimización de Advantage+.

**Recomendación:** Añadir en `sendCAPI` (o en `useMetaPixel`) la extracción de cookies:

```typescript
function getFbCookies() {
  const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1]
  const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1]
  return { fbc, fbp }
}
```
Y pasar estos valores en `user_data` de cada llamada CAPI.

---

### 3.5 — ViewContent se dispara tras un delay de 5 segundos  
**Severidad: ALTA**  
**Archivo:** `src/components/tracking/ProductMetaTracker.tsx:22`

El componente `ProductMetaTracker` usa un `setTimeout` de 5 segundos antes de llamar `trackViewContent()`. En mobile, la tasa de rebote en páginas de producto puede ser del 40–60% en los primeros 3 segundos. Todos esos usuarios no generan ningún ViewContent en Meta, lo que degrada la calidad de las audiencias de retargeting y el modelo de Advantage+ Shopping.

**Recomendación:** Disparar ViewContent inmediatamente al montar (o tras 1–2 segundos como máximo). Si el objetivo del delay era evitar disparos en pre-renders del servidor, la solución correcta es verificar que `window.fbq` esté disponible (lo que ya hace `getFbq()`).

---

### 3.6 — AddToCart e InitiateCheckout duplicados  
**Severidad: ALTA**  
**Archivos:** `src/components/product-page/Header/AddToCardSection.tsx:19`, `src/components/product-page/Header/CheckoutActions.tsx:40`

Ambos componentes importan `useMetaPixel` y llaman a `trackAddToCart` + `trackInitiateCheckout`. Si ambos se renderizan en la misma página de producto (lo cual es probable dado que forman parte del mismo Header de producto), cada acción del usuario genera **dos eventos** sin deduplicación (los event_ids son aleatorios `generateEventId()`).

**Recomendación:** Verificar si ambos componentes coexisten en el mismo árbol. Si es así, mover los calls a un único punto de control o añadir un ref de guardia.

---

### 3.7 — `content_ids` usa slug en lugar de ID numérico  
**Severidad: MEDIA**  
**Archivo:** `src/hooks/useMetaPixel.ts:116`

```typescript
content_ids: [product.slug ?? String(product.id)],
```

Meta Catalog (para Advantage+ Shopping y Dynamic Ads) requiere que `content_ids` coincida exactamente con el campo `id` del product feed. Si el feed usa IDs numéricos (muy probable con Supabase), pero los eventos envían slugs, **el catálogo no puede hacer match** y las campañas de catálogo no funcionarán.

**Recomendación:** Usar siempre `String(product.id)` como `content_id`. El slug puede enviarse en un campo custom adicional si se desea.

---

### 3.8 — `InitiateCheckout` sin `content_type`  
**Severidad: MEDIA**  
**Archivo:** `src/hooks/useMetaPixel.ts:140-150`

El evento `InitiateCheckout` no incluye `content_type: 'product'`. Aunque no es obligatorio, Meta lo usa para la optimización del catálogo y Advantage+. Todos los demás eventos (ViewContent, AddToCart) sí lo incluyen.

**Recomendación:** Añadir `content_type: 'product'` al payload de InitiateCheckout.

---

### 3.9 — Meta Pixel no está en la Content-Security-Policy  
**Severidad: MEDIA**  
**Archivo:** `next.config.mjs`

La CSP incluye dominios de Stripe y Mapbox, pero no los dominios de Meta:
- `https://connect.facebook.net` (carga fbevents.js)
- `https://www.facebook.com` (tracking pixel img, noscript)
- `https://*.facebook.net` (conexiones de eventos desde fbevents.js)

El script de `fbevents.js`, una vez cargado, realiza sus propias peticiones hacia `*.facebook.com` que pueden ser bloqueadas por la CSP. La inyección via `dangerouslySetInnerHTML` evita la restricción de `script-src` para el tag inicial, pero no para las conexiones de red que hace el script.

**Recomendación:** Añadir a la CSP:
```
script-src: https://connect.facebook.net
img-src: https://www.facebook.com
connect-src: https://www.facebook.com https://connect.facebook.net
```

---

### 3.10 — Geolocalización nunca se rellena en tracking_sessions  
**Severidad: MEDIA**  
**Archivos:** `database/tracking-schema.sql`, `src/hooks/useSessionTracker.ts`

La tabla `tracking_sessions` tiene columnas `country`, `region`, `city`, pero el hook `useSessionTracker` nunca las asigna. El middleware de Next.js no existe en este proyecto (no hay `middleware.ts`), por lo que `request.geo` tampoco está disponible.

El endpoint `/api/track` recibe las sesiones pero no añade geolocalización. Todos los registros tendrán `country=null`, `region=null`, `city=null`.

**Recomendación:** Ver §4 (Qué falta para el sistema de tracking en tiempo real).

---

### 3.11 — Cookie banner sin enlace a política de privacidad  
**Severidad: MEDIA (LOPD/GDPR)**  
**Archivo:** `src/components/ui/CookieBanner.tsx`

El banner de cookies es funcional pero no incluye enlace a la política de privacidad. La LOPD española y el RGPD exigen que el usuario pueda acceder a información detallada sobre el tratamiento de datos antes de dar su consentimiento.

**Recomendación:** Añadir un enlace a `/privacidad` o `/politica-de-cookies` en el texto del banner.

---

### 3.12 — RLS deshabilitado en tablas de tracking  
**Severidad: MEDIA**  
**Archivo:** `database/tracking-schema.sql`

Las tablas `tracking_sessions`, `tracking_page_views`, `tracking_product_views`, `tracking_cart_actions`, `tracking_checkouts`, `tracking_conversions`, `tracking_abandonments`, `tracking_events` tienen RLS DESHABILITADO.

Si la `anon key` de Supabase se filtra o se usa en cliente, cualquier consulta directa a la base de datos puede leer todos los datos de comportamiento de usuarios. La escritura usa `service_role` (correcto), pero la lectura no está protegida.

**Recomendación:** Habilitar RLS y añadir políticas `FOR SELECT USING (false)` para bloquear lectura directa desde anon key. Las lecturas deben pasar por server actions o API routes con service_role.

---

### 3.13 — Consentimiento requiere recarga de página  
**Severidad: BAJA**  
**Archivo:** `src/hooks/useCookieConsent.ts`

Al aceptar cookies, se llama a `window.location.reload()`. Esto:
1. Interrumpe la sesión del usuario (pierde posición de scroll, estado de formularios).
2. Causa que el pixel se inicialice con un nuevo PageView, mezclando el inicio de sesión pre-consentimiento con el post-consentimiento.

**Recomendación:** En lugar del reload, usar estado React (`useState` + contexto) para que los componentes de tracking reactiven sin recargar. El pixel puede montarse condicionalmente cuando `consent === 'granted'` ya que `MetaPixel` ya verifica esto.

---

### 3.14 — Sin política de retención de datos  
**Severidad: BAJA (LOPD/GDPR)**  
**Archivos:** `database/tracking-schema.sql`, `database/meta-pixel-schema.sql`

Ninguna tabla tiene campo `expires_at` ni hay jobs de limpieza definidos. Los datos de comportamiento de usuarios se acumulan indefinidamente, lo que incumple el principio de minimización del RGPD y la LOPD (los datos no deben conservarse más tiempo del necesario).

**Recomendación:** Definir una política de retención (e.g., 13 meses para analytics) e implementar un cron job de Supabase para purgar registros antiguos.

---

### 3.15 — Rate limiter falla abierto (fail-open)  
**Severidad: BAJA**  
**Archivo:** `src/lib/rate-limit.ts`

Si Upstash Redis está caído, el rate limiter permite todas las solicitudes (`{ success: true }` en el catch). Es una elección válida para disponibilidad, pero conviene documentarla y asegurarse de que Upstash tiene monitoreo de alertas.

---

## 4. Otros scripts de tracking

| Script | Presente | Método |
|--------|----------|--------|
| Meta Pixel | ✅ | `next/script` con `afterInteractive` + consent gate |
| Conversions API (Meta) | ✅ (parcial) | Graph API v19.0 via fetch server-side |
| Google Analytics 4 | ❌ | No encontrado |
| Google Tag Manager | ❌ | No encontrado |
| TikTok Pixel | ❌ | No encontrado |
| Pinterest Tag | ❌ | No encontrado |
| Hotjar / session recording | ❌ | No encontrado |

**No hay conflictos entre pixels** porque solo existe uno (Meta). La ausencia de GA4/GTM significa que no hay datos de comportamiento en Google Ads ni en Search Console Audiences, lo que limita las campañas de Google.

---

## 5. Qué falta para el sistema de tracking en tiempo real

La infraestructura está bien diseñada (batching, retry, Beacon API, rate limiting). Los gaps principales son:

### 5.1 Geolocalización por IP  
Las columnas `country`, `region`, `city` de `tracking_sessions` nunca se rellenan. Para resolverlo:

**Opción A (recomendada, gratis):** Usar la cabecera de Vercel/Cloudflare que ya incluye el país:
```typescript
// En /api/track/route.ts
const country = req.headers.get('x-vercel-ip-country') ?? 
                req.headers.get('cf-ipcountry') ?? null
const city    = req.headers.get('x-vercel-ip-city') ?? null
const region  = req.headers.get('x-vercel-ip-country-region') ?? null
```
Si el proyecto está en Vercel, estas cabeceras ya están disponibles sin coste adicional.

**Opción B:** Integrar una API de geolocalización IP (ipapi.co, ip-api.com con plan de pago, o MaxMind GeoIP2 con base de datos local).

### 5.2 Tabla de eventos de página en tiempo real  
La vista `analytics_live_page_views` solo muestra los últimos 5 minutos. Para un dashboard en tiempo real completo con drill-down por ruta, sería útil añadir un índice en `tracking_page_views.created_at` y optimizar la vista para consultas frecuentes.

### 5.3 Captura de fbc/fbp en la capa de datos  
Necesaria para la atribución de Meta (ver §3.4). Implementar lectura de cookies `_fbc` y `_fbp` en el cliente y transmitirlas al endpoint CAPI.

### 5.4 Webhook de Stripe con datos de sesión  
El webhook de Stripe (`webhooks/stripe/route.ts`) dispara CAPI para Purchase pero no tiene acceso al `session_id` de analytics. Vincular la conversion de Stripe con la sesión de tracking permitiría el análisis completo del funnel server-side.

**Solución:** Guardar el `tracking_session_id` en `pi.metadata` al crear el PaymentIntent, y recuperarlo en el webhook.

### 5.5 Derechos de acceso y borrado (RGPD Art. 15, 17)  
No hay endpoints para:
- Exportar todos los datos de un usuario por email
- Borrar todos los datos de un usuario

Con LOPD activa, es obligatorio responder a estas solicitudes en 30 días. Implementar como server actions o endpoints de admin protegidos.

### 5.6 Google Analytics 4 (opcional pero recomendado)  
La ausencia de GA4 significa que no hay datos en Google Ads (para campañas de Search/Shopping), ni en Google Search Console Audiences. Si se usan o planean usar campañas de Google, GA4 es imprescindible. Puede añadirse como segundo `<Script strategy="afterInteractive">` con su propio consent gate.

---

## 6. Resumen de estado por componente

| Componente | Estado general | Prioridad de acción |
|------------|---------------|---------------------|
| Meta Pixel - inicialización | ✅ Correcto (consent gate + afterInteractive) | — |
| Meta Pixel - PageView SPA | 🔴 Roto | Inmediata |
| Meta Pixel - ViewContent | 🟠 Funciona con delay excesivo | Alta |
| Meta Pixel - AddToCart | 🟡 Duplicado potencial + sin fbc | Alta |
| Meta Pixel - InitiateCheckout | 🟡 Duplicado + falta content_type | Media |
| Meta Pixel - Purchase | 🟡 Triple CAPI + sin fbc | Alta |
| CAPI - PageView | 🔴 No implementado | Inmediata |
| CAPI - Purchase (webhook) | ✅ Correcto (event_id determinístico) | — |
| CAPI - fbc/fbp cookies | 🔴 No capturado | Alta |
| Analytics propio - sesión | ✅ Bien diseñado | — |
| Analytics propio - pageview | ✅ usePathname correcto | — |
| Analytics propio - geolocalización | 🔴 Columnas vacías | Alta |
| Consentimiento de cookies | ✅ Funcional, gaps LOPD menores | Media |
| Retención de datos | 🔴 Sin política definida | Media |
| RLS tablas de tracking | 🟠 Deshabilitado | Media |
| CSP dominios Meta | 🟠 No incluidos | Media |

---

*Auditoría generada el 2026-07-08. No se modificó ningún archivo del proyecto durante este análisis.*
