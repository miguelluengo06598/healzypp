# Cómo añadir un producto nuevo a tu tienda

Todo el catálogo (nombre, descripción, imágenes, precios y packs) vive en
**un único archivo de código**: `src/data/catalog.ts`. Para añadir un
producto nuevo no hace falta tocar Supabase, ni ningún componente — solo
pedirle a Claude Code que edite ese archivo, con el prompt de más abajo.

---

## Antes de pedirlo

Ten preparado:

1. **Las imágenes ya subidas** a la carpeta `public/images/` de tu
   proyecto (arrástralas ahí antes de pedir el cambio). Anota los nombres
   de archivo exactos (p.ej. `mi-producto-1.png`).
2. **Nombre, descripción larga, descripción corta, categoría.**
3. **El precio de cada pack** que quieras vender (1 unidad, 2 unidades,
   packs de varias unidades... lo que corresponda a tu producto).
4. **El stock inicial** (cuántas unidades tienes disponibles hoy).

⚠️ **Una regla importante que no puedes saltarte**: cada producto nuevo
necesita un `id` numérico y un `slug` (texto) que **no existan ya** en
`catalog.ts` — y los `id` de sus packs/bundles **tampoco pueden repetir**
los `id` de packs de otros productos que ya tengas. Si tienes dudas, pide
a Claude Code que revise `catalog.ts` primero y te confirme qué números
están libres antes de añadir nada.

---

## El prompt listo para copiar

Copia esto en Claude Code, rellena los corchetes `[...]` con tus datos
reales, y bórralos (deja solo el texto, sin los corchetes):

```
Quiero añadir un nuevo producto a mi catálogo. Antes de tocar nada, revisa
src/data/catalog.ts y confírmame qué "id" de producto y qué "id" de bundle
están libres (que no choquen con los productos que ya existen). Luego
añade este producto a la constante CATALOG, siguiendo exactamente el
mismo formato que el producto que ya existe ahí, sin tocar ningún otro
archivo:

- Nombre: [nombre completo del producto]
- Slug: [texto-en-minusculas-con-guiones, sin espacios ni acentos]
- Descripción larga: [2-3 frases describiendo el producto]
- Descripción corta: [una frase, para la tarjeta de producto]
- Categoría: [p.ej. "Suplementos", "Cosmética", etc.]
- Meta title (SEO): [título para buscadores, máx. ~60 caracteres]
- Meta description (SEO): [descripción para buscadores, máx. ~155 caracteres]
- Imágenes (ya subidas a public/images/): [nombre-archivo-1.png, nombre-archivo-2.png, ...]
- Packs/bundles que quiero vender:
  - [Nombre del pack, p.ej. "1 unidad"] — cantidad: [número] — precio: [precio en euros, p.ej. 24.99] — ¿es el más popular?: [sí/no]
  - [Nombre del pack 2] — cantidad: [número] — precio: [precio] — ¿es el más popular?: [sí/no]
  - (añade tantos packs como quieras vender)

Después de editar catalog.ts:
1. Añade también la fila de stock inicial en product_stock (tabla de
   Supabase) para el slug de este producto nuevo, con [cantidad de
   stock inicial] unidades — dame el SQL exacto para que lo ejecute yo
   mismo en el SQL Editor de Supabase (no lo ejecutes tú directamente).
2. Ejecuta npm run build y tsc --noEmit para confirmar que no rompe nada.
3. Dime si el producto nuevo necesita alguna imagen o dato que no te di.
```

---

## Formato exacto que espera `catalog.ts` (por si quieres revisarlo tú mismo)

Cada producto es un objeto con estos campos — todos obligatorios salvo que
se diga "opcional":

| Campo | Qué es | Ejemplo |
|---|---|---|
| `id` | Número fijo, único entre productos | `2` |
| `slug` | Texto estable, minúsculas y guiones, único | `"crema-facial-natural"` |
| `nombre` | Nombre completo | `"Crema Facial Natural"` |
| `descripcion` | Descripción larga | `"Crema hidratante..."` |
| `descripcionCorta` | Una frase | `"Hidratación natural 24h."` |
| `imagenes` | Lista de rutas, la primera es la principal | `["/images/crema-1.png"]` |
| `categoria` | Texto libre | `"Cosmética"` |
| `metaTitle` | Título SEO | `"Crema Facial Natural \| Marca"` |
| `metaDescription` | Descripción SEO | `"Compra crema facial..."` |
| `bundles` | Lista de packs (ver tabla siguiente) | — |

Cada **bundle/pack** dentro de `bundles`:

| Campo | Qué es | Ejemplo |
|---|---|---|
| `id` | Número fijo, único **entre TODOS los productos**, no solo dentro de este | `4` |
| `cantidad` | Unidades reales que contiene (se descuenta del stock) | `1` |
| `nombre` | Nombre del pack | `"1 unidad"` |
| `precio` | Precio real en euros — esto es lo que se cobra | `24.99` |
| `precioOriginal` | Opcional — precio tachado, para mostrar descuento | `29.99` |
| `popular` | Opcional (`true`/`false`) — marca el pack destacado | `true` |

---

## Ejemplo completo (producto de muestra)

Así quedaría un segundo producto añadido a `CATALOG` en `src/data/catalog.ts`
(el `id` de producto es `2` porque el `1` ya lo usa "Gominolas de Vinagre
de Manzana"; los `id` de bundle son `4`/`5`/`6` porque `1`/`2`/`3` ya los
usan los bundles del primer producto):

```ts
{
  id: 2,
  slug: "crema-facial-natural",
  nombre: "Crema Facial Natural",
  descripcion:
    "Crema hidratante facial elaborada con ingredientes 100% naturales. Nutre e hidrata la piel durante 24 horas, apta para todo tipo de piel, incluida la sensible.",
  descripcionCorta: "Hidratación natural 24h, apta para piel sensible.",
  imagenes: ["/images/crema-1.png", "/images/crema-2.png"],
  categoria: "Cosmética",
  metaTitle: "Crema Facial Natural | Hidratación 24h",
  metaDescription:
    "Compra crema facial natural. Hidratación 24h para todo tipo de piel. Envío gratis.",
  bundles: [
    { id: 4, cantidad: 1, nombre: "1 tarro", precio: 24.99, popular: false },
    { id: 5, cantidad: 2, nombre: "Pack 2 tarros", precio: 44.99, precioOriginal: 49.98, popular: true },
    { id: 6, cantidad: 3, nombre: "Pack 3 tarros", precio: 62.99, precioOriginal: 74.97, popular: false },
  ],
},
```

Y la fila correspondiente en `product_stock` (ejecutar en el SQL Editor de
Supabase — Claude Code te dará esta misma sentencia ya rellenada con tus
datos si usas el prompt de arriba):

```sql
INSERT INTO product_stock (product_slug, stock)
VALUES ('crema-facial-natural', 200)
ON CONFLICT (product_slug) DO NOTHING;
```

---

## Después del cambio

- Revisa `/shop` y la ficha del producto nuevo en el navegador.
- Confirma que el stock se insertó: en Supabase → Table Editor →
  `product_stock` → busca tu slug nuevo.
- Haz un pedido de prueba con la tarjeta de test de Stripe
  (`4242 4242 4242 4242`) para confirmar que el precio mostrado y el
  precio cobrado coinciden — deberían, siempre, porque ambos salen del
  mismo `catalog.ts`.
