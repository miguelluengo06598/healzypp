# Cómo añadir un producto nuevo a tu tienda

Todo el catálogo (nombre, descripción, imágenes, precios y packs) vive en
**un único archivo de código**: `src/data/catalog.ts`. Añadir un producto es
editar ese archivo y, aparte, insertar una fila de stock en Supabase.

> **Cambio importante (julio 2026).** Este manual decía antes que bastaba con
> editar `catalog.ts` y que no había que tocar nada más. Eso era cierto cuando
> la tienda tenía un solo producto. Ahora cada pack necesita además un **`sku`
> único**, y hay reglas de unicidad que el proyecto comprueba solo. Ver
> `docs/diseno-catalogo-multi-producto.md` para el porqué.

---

## Antes de pedirlo

Ten preparado:

1. **Las imágenes ya subidas** a `public/images/` (arrástralas ahí antes de
   pedir el cambio). Anota los nombres exactos, p.ej. `mi-producto-1.png`.
2. **Nombre, descripción larga, descripción corta, categoría.**
3. **Los reclamos cortos** que quieras mostrar bajo el título ("100% veganas",
   "Sin azúcares añadidos"…). Si no los das, se usan unos genéricos que **no**
   mencionan ningún ingrediente.
4. **El precio de cada pack** que quieras vender.
5. **El stock inicial** (unidades disponibles hoy).

### ⚠️ Las tres reglas de unicidad

Cada producto nuevo necesita valores que **no existan ya** en `catalog.ts`:

| Campo | Debe ser único entre | Por qué |
|---|---|---|
| `id` de producto | todos los productos | va en la URL `/shop/product/<id>/<slug>` |
| `slug` de producto | todos los productos | es la clave de `product_stock` |
| `sku` de cada pack | **todos los packs de todos los productos** | es lo que identifica qué se cobra |
| `id` de cada pack | **todos los packs de todos los productos** | es el `content_id` que se envía a Meta |

**El proyecto lo comprueba solo**: si repites cualquiera de esos valores, el
`npm run build` falla con un mensaje del tipo
`[catalog] sku de bundle repetido(s): …`. Es a propósito — antes, dos packs
llamados igual hacían que comprar uno cobrase el precio del otro y descontase
el stock del producto equivocado.

---

## El prompt listo para copiar

```
Quiero añadir un nuevo producto a mi catálogo. Antes de tocar nada, revisa
src/data/catalog.ts y confírmame qué id de producto, qué slug y qué ids de
pack están libres. Luego añade este producto a la constante CATALOG,
siguiendo el mismo formato que los que ya existen:

- Nombre: [nombre completo]
- Slug: [texto-en-minusculas-con-guiones, sin espacios ni acentos]
- Descripción larga: [2-3 frases]
- Descripción corta: [una frase, para la tarjeta]
- Categoría: [p.ej. "Suplementos"]
- Meta title (SEO): [máx. ~60 caracteres]
- Meta description (SEO): [máx. ~155 caracteres]
- Reclamos bajo el título: [p.ej. "Con jengibre natural", "100% veganas", ...]
- Imágenes (ya en public/images/): [archivo-1.png, archivo-2.png, ...]
- Packs que quiero vender:
  - [Nombre, p.ej. "1 Bote"] — cantidad: [nº] — precio: [p.ej. 24.99] — ¿el más popular?: [sí/no]
  - [Nombre pack 2] — cantidad: [nº] — precio: [precio] — ¿el más popular?: [sí/no]

Cada pack necesita un `sku` único con el formato <slug-del-producto>-x<cantidad>.

Después de editar catalog.ts:
1. Dame el SQL del INSERT en product_stock para este slug con [cantidad]
   unidades, para ejecutarlo yo en Supabase.
2. Ejecuta npm run build y npx tsc --noEmit para confirmar que no rompe nada
   (el build falla solo si repites algún identificador).
3. Levanta npm run dev y comprueba en el navegador que la ficha del producto
   nuevo muestra SUS precios, no los de otro producto.
4. Dime si falta alguna imagen o dato.
```

---

## Formato exacto que espera `catalog.ts`

Cada producto:

| Campo | Qué es | Ejemplo |
|---|---|---|
| `id` | Número fijo, único entre productos | `2` |
| `slug` | Texto estable, único — clave de `product_stock` | `"gominolas-jengibre"` |
| `nombre` | Nombre completo | `"Gominolas de Jengibre"` |
| `descripcion` | Descripción larga | `"Gominolas naturales..."` |
| `descripcionCorta` | Una frase | `"60 gominolas de jengibre natural."` |
| `imagenes` | Lista de rutas, la primera es la principal | `["/images/jengibre-1.png"]` |
| `categoria` | Texto libre | `"Suplementos"` |
| `metaTitle` | Título SEO | `"Gominolas de Jengibre \| Natural"` |
| `metaDescription` | Descripción SEO | `"Compra gominolas..."` |
| `beneficios` | Opcional — reclamos bajo el título | `["Con jengibre natural", ...]` |
| `bundles` | Lista de packs (ver abajo) | — |

Cada **pack** dentro de `bundles`:

| Campo | Qué es | Ejemplo |
|---|---|---|
| `sku` | **Único en TODO el catálogo.** Formato `<slug>-x<cantidad>` | `"gominolas-jengibre-x2"` |
| `id` | Número fijo, **único en TODO el catálogo** — es el `content_id` de Meta | `5` |
| `cantidad` | Unidades reales que contiene (se descuentan del stock) | `2` |
| `nombre` | Nombre corto del pack | `"2 Botes"` |
| `precio` | Precio real en euros — esto es lo que se cobra | `44.99` |
| `precioOriginal` | Opcional — precio tachado | `49.98` |
| `popular` | Opcional — marca el pack destacado | `true` |

> El `sku` se escribe **a mano**, no se calcula. Acaba grabado en las filas de
> `order_items` de pedidos ya hechos: si se derivara del slug o de la cantidad,
> editar cualquiera de esos campos cambiaría en silencio el identificador de un
> pack ya vendido.

> En el carrito los packs se muestran como `"Producto — Pack"` (p.ej.
> `"Gominolas de Jengibre — 2 Botes"`). Eso se genera solo: **no** escribas el
> nombre del producto dentro de `nombre`.

---

## Ejemplo completo

```ts
{
  id: 2,
  slug: "gominolas-jengibre",
  nombre: "Gominolas de Jengibre",
  descripcion:
    "Gominolas naturales elaboradas con jengibre. Favorecen la digestión y aportan energía. 60 unidades por bote.",
  descripcionCorta: "60 gominolas de jengibre natural, digestión y energía.",
  imagenes: ["/images/jengibre-1.png", "/images/jengibre-2.png"],
  categoria: "Suplementos",
  metaTitle: "Gominolas de Jengibre | Natural y Vegano",
  metaDescription:
    "Compra gominolas de jengibre natural. Favorecen la digestión. Envío gratis.",
  beneficios: [
    "Con jengibre natural",
    "100% veganas",
    "Sin azúcares añadidos",
  ],
  bundles: [
    { sku: "gominolas-jengibre-x1", id: 4, cantidad: 1, nombre: "1 Bote",  precio: 24.99 },
    { sku: "gominolas-jengibre-x2", id: 5, cantidad: 2, nombre: "2 Botes", precio: 44.99, precioOriginal: 49.98, popular: true },
    { sku: "gominolas-jengibre-x3", id: 6, cantidad: 3, nombre: "3 Botes", precio: 59.99, precioOriginal: 74.97 },
  ],
},
```

Y la fila de stock (ejecutar en el SQL Editor de Supabase):

```sql
INSERT INTO product_stock (product_slug, stock)
VALUES ('gominolas-jengibre', 100)
ON CONFLICT (product_slug) DO NOTHING;
```

**Sin esa fila el producto no se puede comprar**: el stock disponible se lee
como 0 y el checkout rechaza el pago con "No hay stock suficiente".

---

## Después del cambio

- Revisa `/shop` y la ficha del producto nuevo. Comprueba que muestra **sus**
  precios y **sus** reclamos, no los de otro producto.
- Confirma el stock en Supabase → Table Editor → `product_stock`.
- Haz un pedido de prueba con la tarjeta de test de Stripe
  (`4242 4242 4242 4242`, caducidad `12/34`, CVC `123`) y comprueba que:
  - el importe cobrado es el del pack que elegiste,
  - en `order_items` la fila tiene el `product_slug` correcto,
  - baja el stock **de ese producto**, no el de otro.

Si el producto nuevo tiene un stock alto y el otro bajo, ese último punto es la
mejor forma de detectar una configuración mal hecha.

---

## Qué NO hace falta tocar

`src/data/products.ts` y `src/lib/bundles.ts` son adaptadores sin datos
propios: derivan todo de `catalog.ts` y recorren el catálogo entero, así que un
producto nuevo aparece solo. **No edites precios ahí** — no tendría efecto en lo
que se cobra y quedaría desincronizado con el resto de la tienda.
