# Auditoría completa v2 — healzypp-clean

Fecha: 2026-07-16. Auditoría desde cero sobre `main` (post-merge de PRs #9-#13 y
del borrado de código muerto). Cada hallazgo verificado hoy contra el código
actual con comandos reales (grep/knip/build), no heredado de la auditoría v1.

Estado global: las 5 fases de la auditoría v1 están aplicadas y verificadas.
El perfil de riesgo ha cambiado: ya no dominan los fallos técnicos de pagos,
sino **problemas legales/de contenido** y un blocker estructural de SSR.

---

## 1. Seguridad y pagos

### Verificado como resuelto hoy (regresión-check de la v1)
| Control | Evidencia |
|---|---|
| Verificación de precio server-side antes de cobrar | `api/create-payment-intent/route.ts` + `api/checkout/create-payment-intent` |
| Origin/Sec-Fetch-Site en rutas de pago | `lib/security/origin-check.ts` importado en ambas rutas |
| Rate limiting (cupones, analytics, createOrder, CAPI) | `lib/rate-limit.ts` |
| Idempotencia del webhook ante redeliveries | guard `estado === "pagado"` en webhook |
| IDOR `getOrderByNumber` | Eliminada (no existe en `src/`) |
| `/api/analytics/live` | Gate `isCurrentUserAdmin()` (403 sin admin) en L22 |
| Placeholders Stripe en `.env.local.example` | `pk_test_`/`sk_test_` |
| PII en notificaciones ntfy | Reducido a pedido+importe+PI id |
| Decremento de stock atómico solo tras pago | RPC `decrement_product_stock` desde webhook |
| `getOrdersByUser` sin IDOR | RLS `orders_select_own`, sin `userId` manual |

### Pendiente
| Severidad | Hallazgo | Ubicación | Acción |
|---|---|---|---|
| Media | Migración transaccional `order_items`+`order_tracking` propuesta y NO aplicada — sigue existiendo la ventana (hoy secuencial, sin huérfanos, pero sin atomicidad) | `supabase/migrations/0003_*.sql` + `docs/propuesta-migracion-0003-*.md` | Sesión dedicada: aplicar en SQL Editor + cambiar `orders.ts` a `db.rpc(...)` + re-test |
| Media | Login real end-to-end sin verificar: el fix `createBrowserClient` (sesión en cookies) está confirmado a nivel de mecanismo del SDK, pero nunca se ha presenciado un login→/account completo (Supabase inalcanzable desde el entorno de dev) | `lib/supabase.ts` | Probar en staging/prod con backend real |
| Baja | Mojibake UTF-8 en `.env.local.example` (comentarios ilegibles) | `.env.local.example` | Re-guardar en UTF-8 |

## 2. Legal / contenido — LO MÁS GRAVE HOY

| Severidad | Hallazgo | Ubicación | Acción |
|---|---|---|---|
| **Alta** | **Contradicción de política de devoluciones**: el marketing promete "Devolución gratuita 30 días" en 3 puntos activos del flujo de compra, pero `/terms` establece 14 días naturales con gastos a cargo del comprador. Riesgo real de consumo (la promesa más favorable al consumidor puede ser exigible) | `CartOrderSummary.tsx:164`, `PaymentSection.tsx:226`, `QuickProductPreviewModal.tsx:59` vs `(legal)/terms` | Decisión de negocio: o la política es 30 días gratis (→ actualizar /terms) o es la legal de 14 (→ corregir los 3 claims). Bloquea también el montaje de `ReturnPolicySummary.tsx` |
| **Alta** | **Placeholders de plantilla en páginas legales**: "Nombre Tienda S.L.", `info@shopco.com`, `devoluciones@shopco.com` en aviso legal, privacidad y términos; "Nombre Tienda ©" en el footer. Incumple la identificación del prestador (LSSI art. 10) y las direcciones de contacto no existen | `(legal)/aviso-legal`, `(legal)/privacy`, `(legal)/terms`, `sections/Footer` | Sustituir por los datos reales de la sociedad antes de operar |
| Media | Plazos de envío inconsistentes entre sí: `/terms` dice "2-5 días laborables", la opción Estándar del checkout dice "4-6 días laborables", y `DeliveryTimeline` promete fecha concreta con corte 14:00 | `(legal)/terms`, `lib/shipping.ts`, `sections/DeliveryTimeline` | Unificar en una sola fuente de verdad |
| Media | `/cart` muestra "Gastos de Envío: **Gratis**" hardcodeado, pero el checkout cobra 3,99 € si subtotal < 50 € | `app/cart/page.tsx:72` | Calcular con `getShippingPrice()` o mostrar "calculado en el checkout" |
| Media | Input de promo de `/cart` no funcional (el botón "Aplicar" no hace nada; el cupón real vive en checkout) | `app/cart/page.tsx:83-99` | Conectarlo a `validate-coupon` o eliminarlo |
| Media | Urgencia artificial: countdown del TopBanner ("solo durante 10:00") que se reinicia por visitante, y social proof sin respaldo ("2000+ Clientes Satisfechos", contadores del hero) | `sections/TopBanner`, `HeroSectionDynamica.tsx:32` | Misma vara que las reseñas falsas ya eliminadas: sustituir por claims reales o quitar |

## 3. Estructura / SSR

| Severidad | Hallazgo | Ubicación | Acción |
|---|---|---|---|
| **Alta** | **PersistGate sigue bloqueando el SSR de toda la app**: el servidor renderiza spinner en vez de contenido (afecta LCP y hace que el HTML inicial llegue casi vacío a crawlers sin JS). Diseño de solución ya documentado y validado | `app/providers.tsx:19` + `docs/fase3-persistgate-ssr.md` | Implementar el diseño documentado (redirect condicionado a `_persist.rehydrated` + guards de montaje) — NO el one-liner `loading={children}`, ya probado y revertido |
| Media | Mismatch de query param del guard de cuenta: `account/layout.tsx` redirige a `/?login=true` pero `AuthQueryHandler` escucha `?auth=required` → el modal de login nunca se abre tras el rebote | `account/layout.tsx:40` vs `AuthQueryHandler.tsx:11` | Unificar el parámetro (1 línea) |
| Media | Drawer de StickySmartCart sigue siendo UI muerta (sin disparador) | `StickySmartCart.tsx` + `docs/deuda-drawer-sticky-cart-muerto.md` | Decisión pendiente: restaurar disparador o eliminar |

## 4. Rendimiento

Resuelto y verificado: lazy-load de CheckoutModal, SSG de ficha (`●` en build),
`.woff2`, imágenes optimizadas con `priority` selectivo, `createOrder` con
lecturas paralelas. Pendiente: el propio PersistGate (§3) es hoy el mayor coste
de rendimiento percibido (client-render de casi todo), y la etapa
items+tracking de `createOrder` sigue secuencial hasta aplicar la migración 0003.

## 5. SEO

Resuelto y verificado: metadata única por producto, canonical + redirect 308,
JSON-LD Product/Breadcrumb (sin ratings inventados), sitemap/robots, OG/Twitter.
Pendientes: (a) PersistGate (§3) limita el HTML server-rendered — el JSON-LD se
inyecta vía cliente por esta causa; (b) imagen OG es la de producto 500×500,
falta asset 1200×630; (c) inconsistencias de contenido del §2 afectan a la
confianza (E-E-A-T).

## 6. Accesibilidad

Fase 4 v1 aplicada y verificada (aria-labels, alt distintivo, teclado, contraste
AA en checkout). Pendientes: (a) el verde de marca `#487D26` sobre blanco queda
justo para texto pequeño — el cambio global a `#3a6620` se descartó por tocar 34
archivos con hex crudo; considerar tokenizar el color primero; (b) no hay
auditoría automatizada (axe/lighthouse-ci) en CI — recomendable para evitar
regresiones.

## 7. Código muerto y dependencias (knip, hoy)

| Hallazgo | Acción |
|---|---|
| `trust/DeliveryEstimates.tsx` y `trust/ReturnPolicySummary.tsx` — los 2 "Revisar" siguen sin montar | DeliveryEstimates: plan aprobado pendiente (montar en /cart con 3 correcciones de datos). ReturnPolicySummary: bloqueado por la contradicción del §2 |
| Dependencias huérfanas tras el borrado de los 34: `@radix-ui/react-slider`, `usehooks-ts`, `jose` | Quitar de `package.json` (jose: verificar que nada del server lo usa antes) |
| `postcss-load-config` usada sin declarar | Añadir a devDependencies |
| Exports sueltos sin uso (shadcn parciales, tipos de schema) | No tocar — coste>beneficio, documentado en v1 |

## 8. Plan propuesto v2 (por orden)

1. **Legal/contenido** (§2): datos reales de la sociedad + resolver contradicción
   de devoluciones + unificar plazos de envío + honestidad de /cart y urgencia.
   Es lo único con riesgo regulatorio real y casi todo es texto.
2. **PersistGate SSR** (§3): implementar el diseño ya documentado.
3. **Auth**: fix del query param (1 línea) + verificación de login real en
   staging + decisión del drawer.
4. **Limpieza**: deps huérfanas, migración 0003, montar/borrar los 2 trust,
   asset OG 1200×630, mojibake.
