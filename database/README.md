# Base de datos — Supabase

Esta carpeta contiene un único archivo SQL: **`SETUP-COMPLETO.sql`**. Crea
todo el esquema de la tienda de un tirón (productos, pedidos, cupones,
tracking/analytics, auditoría de Meta Pixel y las funciones del dashboard
SaaS opcional).

## Instalación

**No sigas los pasos de este README manualmente** — usa la guía completa
con capturas y ejemplos exactos de qué copiar y dónde pegarlo:

👉 **[`GUIA-INSTALACION.md`](../GUIA-INSTALACION.md)** (en la raíz del
proyecto).

Resumen ultra-corto para quien ya conoce Supabase:

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. SQL Editor → New query → pega **todo** el contenido de
   `SETUP-COMPLETO.sql` → Run.
3. Confirma la tabla de verificación al final: 21 filas, todas
   `✅ creada`.
4. Copia las 3 claves de Project Settings → API a tu `.env.local`
   (ver `.env.local.example` para el nombre exacto de cada variable).

## Row Level Security (RLS)

El script activa RLS en todas las tablas salvo `bundles` (histórico, sin
impacto real porque todo el acceso privilegiado pasa por
`service_role`, que bypasa RLS de todas formas). Patrón general:

| Tabla | Lectura pública (anon) | Escritura |
|---|---|---|
| `products`, `product_variants`, `bundles`, `coupons` | Solo si `activo = true` | Solo admin (`is_admin()`) |
| `reviews` | Solo `aprobado = true` | Propia (dueño de la reseña) o admin |
| `orders`, `order_items`, `order_tracking`, `cart_items`, `profiles`, `addresses` | Solo las propias del usuario logueado | Propia o admin |
| `tracking_*`, `meta_pixel_events` | ❌ Ninguna (`USING (false)`) | Solo `service_role` |
| `contact_messages` | ❌ Ninguna | `INSERT` público (formulario de contacto); `SELECT` solo admin |

Las escrituras privilegiadas (crear pedidos, decrementar stock, leer
métricas del dashboard) siempre se hacen desde el servidor con
`createServiceClient()` (usa `SUPABASE_SERVICE_ROLE_KEY`), que bypasa RLS
por completo — el navegador nunca tiene acceso directo de escritura a
`orders`, `products`, etc.

## Regenerar tipos TypeScript tras modificar el esquema

```bash
npx supabase gen types typescript \
  --project-id <TU_PROJECT_ID> \
  > src/types/database.types.ts
```

El `project-id` está en **Project Settings** → **General** → **Reference ID**.

## Estructura de tablas

```
products, product_variants, bundles   → Catálogo y packs de compra
profiles, addresses                   → Usuarios y direcciones
orders, order_items, order_tracking    → Pedidos y su historial de estado
coupons                                → Cupones de descuento
cart_items                             → Carrito persistente (opcional, hoy sin uso activo)
reviews                                → Reseñas de clientes
contact_messages                       → Mensajes del formulario de contacto
tracking_*                             → Sesiones/eventos de analytics propio
meta_pixel_events                      → Auditoría de eventos enviados a Meta CAPI
```
