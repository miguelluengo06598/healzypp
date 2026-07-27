# Guía de instalación — de cero a tienda funcionando

Esta guía está pensada para que puedas configurar tu tienda **copiando y
pegando**, sin necesidad de saber programar. Sigue los pasos en este orden
exacto — cada uno depende del anterior.

Al final tendrás: base de datos creada, pagos con tarjeta funcionando, tu
marca personalizada, y la tienda desplegada y accesible en internet.

---

## Paso 1 — Crear el proyecto en Supabase

Supabase es la base de datos donde se guardan tus productos, pedidos y
clientes.

1. Ve a **[supabase.com](https://supabase.com)** y crea una cuenta (o inicia
   sesión) — puedes usar tu cuenta de GitHub o Google.
2. En el panel principal, haz clic en el botón verde **"New Project"**.
3. Rellena el formulario:
   - **Name**: el nombre que quieras para identificar el proyecto (p.ej.
     "mi-tienda"). No es el nombre visible de tu tienda, solo una etiqueta
     interna de Supabase.
   - **Database Password**: haz clic en **"Generate a password"** y
     **guarda esa contraseña en un sitio seguro** (un gestor de
     contraseñas, o un documento privado). La necesitarás más adelante si
     alguna vez quieres conectar herramientas externas a la base de datos.
   - **Region**: elige **"Central EU (Frankfurt)"**. Es la recomendación
     por defecto para tiendas que venden en España/Europa (menor latencia).
     ⚠️ **No se puede cambiar después** sin crear un proyecto nuevo, así
     que confírmalo antes de continuar.
4. Haz clic en **"Create new project"** y espera 1-2 minutos mientras
   Supabase prepara todo (verás una barra de progreso).

---

## Paso 2 — Ejecutar el SQL que crea toda la base de datos

Cuando el proyecto esté listo (ya no verás la barra de progreso):

1. En el menú de la izquierda, busca el icono con forma de **`</>`** o
   **terminal** — se llama **"SQL Editor"** — y haz clic en él.
2. Haz clic en **"New query"** (arriba a la izquierda del editor).
3. Abre el archivo **`database/SETUP-COMPLETO.sql`** de este proyecto,
   selecciona **todo** su contenido (Ctrl+A) y cópialo (Ctrl+C).
4. Pega ese contenido completo en el cuadro grande del SQL Editor de
   Supabase (Ctrl+V).
5. Haz clic en el botón verde **"Run"** (o pulsa Ctrl+Enter).
6. Espera unos segundos. Verás el resultado en la parte inferior de la
   pantalla.

---

## Paso 3 — Verificar que todo se creó correctamente

El propio script termina con una comprobación automática. En el panel de
resultados (parte inferior), busca una tabla con dos columnas:
`tabla_esperada` y `estado`.

**Debes ver 21 filas, y las 21 deben decir `✅ creada`.**

- Si ves las 21 filas en verde/con el check ✅ → todo correcto, pasa al
  paso 4.
- Si alguna fila dice `❌ FALTA` → algo falló al ejecutar el script.
  Desplázate hacia arriba en el panel de resultados: verás un mensaje de
  error en rojo que indica en qué punto se detuvo. Vuelve a copiar y pegar
  el SQL completo (Paso 2) y ejecútalo de nuevo — es seguro repetirlo
  cuantas veces haga falta, no duplica nada.

---

## Paso 4 — Copiar las claves de API de Supabase

Ahora necesitas 3 datos de tu proyecto de Supabase para conectarlo con la
tienda.

1. En el menú de la izquierda, baja hasta el icono de **engranaje** ⚙️ —
   se llama **"Project Settings"**.
2. Dentro, haz clic en la pestaña **"API"** (o "API Keys", según la
   versión).
3. Verás 3 datos que necesitas copiar:
   - **Project URL** (una dirección tipo `https://xxxxxxxx.supabase.co`)
   - **anon / public** (una clave larga que empieza por `eyJ...`)
   - **service_role / secret** (otra clave larga que empieza por `eyJ...`
     — puede que tengas que hacer clic en un icono de "ojo" o
     "Reveal" para verla completa)

4. En la carpeta del proyecto, busca el archivo **`.env.local.example`**,
   duplícalo y renombra la copia a **`.env.local`** (sin ".example").
5. Abre `.env.local` y busca estas 3 líneas. Sustituye lo que hay después
   del `=` por los 3 valores que acabas de copiar, así:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Importante**: nunca compartas la clave `SUPABASE_SERVICE_ROLE_KEY` ni
la subas a ningún repositorio público — da acceso completo a tu base de
datos, saltándose todas las protecciones.

---

## Paso 5 — Configurar Stripe (pagos con tarjeta)

1. Ve a **[dashboard.stripe.com](https://dashboard.stripe.com)** y crea una
   cuenta (o inicia sesión).
2. Arriba a la derecha, confirma que el interruptor dice **"Test mode"**
   (modo de pruebas) — así puedes probar la tienda sin cobrar dinero real.
3. En el menú de la izquierda, ve a **"Developers"** → **"API keys"**.
4. Copia estos dos valores:
   - **Publishable key** (empieza por `pk_test_...`)
   - **Secret key** (empieza por `sk_test_...` — haz clic en "Reveal
     test key" para verla)
5. Pégalos en `.env.local`:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
```

6. **El webhook** (avisa a tu tienda cuando un pago se confirma o falla).
   Esto necesita la dirección real de tu tienda en internet, así que hay
   dos casos:
   - Si **ya desplegaste** tu tienda en Vercel (Paso 8), continúa aquí
     mismo.
   - Si **todavía no**, salta este punto 6 y vuelve a él después de
     terminar el Paso 8 — no pasa nada por hacerlo en otro orden.

   En Stripe: **"Developers"** → **"Webhooks"** → **"Add endpoint"**.
   - **Endpoint URL**: `https://TU-DOMINIO/api/webhooks/stripe`
     (sustituye `TU-DOMINIO` por el dominio real que te dio Vercel en el
     Paso 8, por ejemplo `https://mi-tienda.vercel.app`).
   - **Eventos a escuchar**: haz clic en "Select events" y marca
     exactamente estos dos:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Haz clic en **"Add endpoint"**.
7. Dentro del webhook recién creado, busca **"Signing secret"** y haz clic
   en **"Reveal"**. Copia ese valor (empieza por `whsec_...`) y pégalo:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Cuando quieras cobrar dinero real: cambia el interruptor a **"Live mode"**
en Stripe, repite los pasos 3-7 con las claves `pk_live_`/`sk_live_` (son
distintas a las de test), y crea un **webhook nuevo** en modo Live (los
webhooks de test y live son independientes) — luego actualiza esas 3
variables en Vercel (Paso 8).

---

## Paso 6 — Email transaccional (Resend u otro) — no aplica hoy

Esta plantilla **no envía emails** a tus clientes ni a ti mismo hoy. Lo que
sí existe:
- El formulario de `/contact` guarda el mensaje directamente en tu base de
  datos (tabla `contact_messages`) — para leerlo, entra a Supabase → Table
  Editor → `contact_messages`.
- Los avisos de "nuevo pedido"/"pago fallido" te llegan por **notificación
  push** (ntfy y/o Pushover), no por email — se configuran en el Paso 7.

Si más adelante quieres que se envíe un email de confirmación al cliente,
o que los mensajes de contacto lleguen a tu bandeja de entrada, eso es una
funcionalidad nueva a construir (con Resend u otro proveedor) — pregúntamelo
en otra tarea cuando llegue el momento.

---

## Paso 7 — Personalizar tu marca y funciones opcionales

Todo el nombre/dominio/email visible de tu tienda se controla desde
variables de entorno — **no hace falta tocar ningún archivo de código**.

En `.env.local`, añade o edita estas líneas con tus datos reales:

```
NEXT_PUBLIC_SITE_NAME=Nombre De Tu Tienda
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_CONTACT_EMAIL=hola@tu-dominio.com
```

- `NEXT_PUBLIC_SITE_NAME` — aparece en el logo de texto (navbar/footer),
  el título de la pestaña del navegador, y las notificaciones.
- `NEXT_PUBLIC_SITE_URL` — pon tu dominio real una vez lo tengas (si usas
  el dominio gratuito de Vercel del Paso 8, pon ese).
- `NEXT_PUBLIC_CONTACT_EMAIL` — el email que ven tus clientes en la página
  de confirmación de pedido.

**Extras opcionales** (la tienda funciona sin ellos, pero mejoran la
experiencia o te avisan de nuevos pedidos):

| Variable(s) | Para qué sirve | Dónde conseguirlo |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Autocompletar direcciones en el checkout | [account.mapbox.com](https://account.mapbox.com/) — cuenta gratuita |
| `NTFY_TOPIC` | Aviso push a tu móvil de cada pedido nuevo/pago fallido | Elige un nombre de topic único en [ntfy.sh](https://ntfy.sh) (gratis, sin cuenta) |
| `PUSHOVER_USER_KEY` + `PUSHOVER_API_TOKEN` | Alternativa/complemento a ntfy, notificación push más completa | [pushover.net](https://pushover.net/) — cuenta gratuita |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Limitar intentos de pago/cupón por IP (anti-abuso). Sin esto, esa protección queda desactivada pero la tienda sigue funcionando | Base de datos gratuita en [console.upstash.com](https://console.upstash.com/) |
| `NEXT_PUBLIC_META_PIXEL_ID` + `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` | Anuncios de Facebook/Instagram (medir conversiones) | [business.facebook.com/events_manager](https://business.facebook.com/events_manager) |

Cada una tiene su explicación detallada como comentario en
`.env.local.example`.

---

## Paso 8 — Desplegar en Vercel

Vercel es donde tu tienda vive de verdad en internet (gratis para empezar).

1. Sube el código de tu proyecto a un repositorio de **GitHub** (si aún no
   lo has hecho).
2. Ve a **[vercel.com](https://vercel.com)** y crea una cuenta iniciando
   sesión con GitHub.
3. Haz clic en **"Add New..."** → **"Project"**.
4. Busca y selecciona tu repositorio → **"Import"**.
5. Antes de darle a "Deploy", despliega la sección **"Environment
   Variables"**. Abre tu archivo `.env.local` completo, y por cada línea
   `NOMBRE=valor`, añade una variable en Vercel con ese mismo nombre y
   valor (cópialas todas, una por una).
6. Haz clic en **"Deploy"** y espera 1-2 minutos.
7. Cuando termine, Vercel te da una dirección tipo
   `https://tu-proyecto.vercel.app` — esa es tu tienda ya publicada.
8. **Vuelve al Paso 5, punto 6** para crear el webhook de Stripe con esta
   dirección real (si no lo habías hecho aún), y actualiza
   `NEXT_PUBLIC_SITE_URL` tanto en Vercel como en tu `.env.local` local con
   esta misma dirección (o tu dominio personalizado si conectas uno).
9. Si cambias cualquier variable de entorno en Vercel después del primer
   despliegue, tendrás que volver a desplegar (Vercel → tu proyecto →
   "Deployments" → botón "Redeploy") para que el cambio tenga efecto.

---

## Paso 9 — Checklist final de seguridad y funcionamiento

Antes de compartir el link de tu tienda con clientes reales, confirma cada
punto:

- [ ] Ejecuté `database/SETUP-COMPLETO.sql` completo y vi las **21 filas
      "✅ creada"** en la verificación (Paso 3).
- [ ] Pegué las 3 claves de Supabase (URL, anon, service_role) en
      `.env.local` (Paso 4).
- [ ] Configuré Stripe: claves copiadas, webhook creado apuntando a mi
      dominio real, con los eventos `payment_intent.succeeded` y
      `payment_intent.payment_failed`, y el `STRIPE_WEBHOOK_SECRET`
      copiado (Paso 5).
- [ ] Cambié `NEXT_PUBLIC_SITE_NAME` (y `SITE_URL`/`CONTACT_EMAIL`) para
      que la tienda muestre el nombre de MI negocio, no "HEALZYP"
      (Paso 7).
- [ ] Copié TODAS las variables de `.env.local` en Vercel y desplegué
      (Paso 8).
- [ ] `NEXT_PUBLIC_SITE_URL` y la URL del webhook de Stripe apuntan a mi
      dominio real de producción, no a `localhost` (Paso 8).
- [ ] Hice un **pedido de prueba de principio a fin** en mi tienda ya
      desplegada, usando la tarjeta de test de Stripe
      `4242 4242 4242 4242`, cualquier fecha futura de caducidad y
      cualquier CVC — y confirmé que el pedido aparece como pagado.
- [ ] Si cambié algo en Stripe a "Live mode" para cobrar de verdad, repetí
      los pasos de claves + webhook en modo Live (son independientes del
      modo Test).

Si todos los puntos están marcados: tu tienda está lista para recibir
clientes reales.
