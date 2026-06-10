# Base de datos — Supabase

Guía completa para configurar la base de datos del proyecto.

---

## 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Haz clic en **New project**
3. Elige un nombre (ej: `gominolas-store`) y una contraseña segura para la base de datos
4. Selecciona la región más cercana a tu audiencia (ej: **West EU** para España)
5. Espera ~2 minutos a que el proyecto se inicialice

---

## 2. Ejecutar el schema SQL

1. En el panel de Supabase, ve a **SQL Editor** (icono de terminal en el menú lateral)
2. Haz clic en **New query**
3. Abre el archivo `database/schema.sql` y copia todo su contenido
4. Pégalo en el editor y haz clic en **Run** (o `Ctrl+Enter`)
5. Deberías ver: `Success. No rows returned`

> Si necesitas reiniciar el schema desde cero, descomenta las líneas `DROP TABLE` al inicio del archivo antes de ejecutar.

---

## 3. Obtener las credenciales

Ve a **Project Settings** → **API** y copia:

| Variable | Dónde encontrarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` key |

Crea el archivo `.env.local` en la raíz del proyecto (copia de `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **IMPORTANTE:** `SUPABASE_SERVICE_ROLE_KEY` no lleva el prefijo `NEXT_PUBLIC_` porque NO debe exponerse al navegador. Solo se usa en Server Actions y API Routes.

---

## 4. Row Level Security (RLS)

El schema ya configura RLS automáticamente:

| Tabla | Lectura anon | Escritura anon |
|---|---|---|
| `products` | ✅ Solo activos | ❌ |
| `bundles` | ✅ Solo activos | ❌ |
| `reviews` | ✅ Solo visibles | ❌ |
| `customers` | ❌ | ❌ |
| `orders` | ❌ | ❌ |
| `order_items` | ❌ | ❌ |

Las escrituras de pedidos se realizan desde el servidor usando `SUPABASE_SERVICE_ROLE_KEY`, que bypasa RLS. El navegador nunca tiene acceso directo a `orders` o `customers`.

---

## 5. Instalar el SDK de Supabase

```bash
npm install @supabase/supabase-js
```

---

## 6. Uso en el código

### Leer datos (cliente o servidor)
```typescript
import { supabase } from '@/lib/supabase'

const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('active', true)
```

### Crear un pedido (solo desde Server Action o API Route)
```typescript
import { createOrder } from '@/lib/db/orders'

const result = await createOrder({
  customerData: {
    fullName: 'María García',
    phone: '612345678',
    address: 'Calle Mayor 12',
    postalCode: '28001',
    city: 'Madrid',
    province: 'Madrid',
  },
  bundleId: 2,
  paymentMethod: 'COD',
})

if (result.success) {
  console.log('Pedido creado:', result.orderNumber)
}
```

---

## 7. Regenerar tipos TypeScript automáticamente

Cuando modifiques el schema, puedes regenerar los tipos ejecutando:

```bash
npx supabase gen types typescript \
  --project-id <TU_PROJECT_ID> \
  > src/types/database.types.ts
```

El `project-id` está en **Project Settings** → **General** → **Reference ID**.

---

## 8. Estructura de tablas

```
products          → Catálogo de productos
bundles           → Packs de compra (1/2/3 botes)
customers         → Compradores (se crea al hacer el primer pedido)
orders            → Pedidos realizados
order_items       → Líneas de cada pedido
reviews           → Reseñas de clientes
```

---

## 9. Conectar el checkout COD con Supabase

En `src/app/checkout/cod/page.tsx`, reemplaza el `TODO` del `onSubmit` con:

```typescript
import { createOrder } from '@/lib/db/orders'

const result = await createOrder({
  customerData: {
    fullName: data.fullName,
    phone: data.phone,
    address: data.address,
    postalCode: data.postcode,
    city: data.city,      // campo hidden rellenado por Mapbox
    province: data.province, // campo hidden rellenado por Mapbox
  },
  bundleId: bundle.id,
  paymentMethod: 'COD',
})

if (!result.success) {
  // mostrar error al usuario
  return
}

// redirigir a confirmación
router.push(`/checkout/success?order=${result.orderNumber}`)
```

> Nota: `createOrder` llama a `createServiceClient()` que requiere `SUPABASE_SERVICE_ROLE_KEY`. Para que funcione desde el navegador necesitas moverlo a una **Server Action** (`'use server'`) o una **API Route** (`/api/orders/route.ts`).
