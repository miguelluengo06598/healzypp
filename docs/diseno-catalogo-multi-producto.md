# Diseño: soporte real de varios productos en el catálogo

Estado: **aprobado el diseño, sin implementar**. Documento de trabajo de la
rama `prueba-producto-nuevo`. No tocar código de producción hasta que el
propietario lo autorice explícitamente.

---

## 1. Por qué hace falta

La tienda nació mono-producto y varias piezas lo dan por supuesto. Al añadir
un segundo producto (`gominolas-jengibre`) afloraron tres fallos, uno de ellos
capaz de cobrar y enviar el producto equivocado.

### 1.1 El fallo grave: colisión al resolver el bundle

`src/app/api/checkout/create-payment-intent/route.ts` identifica lo que se
está comprando por el **nombre** del bundle (`attributes[0]`, p.ej. `"2 Botes"`)
y lo busca con `findBundleByNameAcrossCatalog`, que devuelve la **primera
coincidencia** recorriendo `CATALOG`.

Como ambos productos tienen bundles llamados `"1 Bote"` / `"2 Botes"` /
`"3 Botes"`, comprar el pack de 2 del **jengibre** (44,99 €) resolvería al
bundle del **vinagre**: se cobrarían 49,99 € y se descontaría stock de
`gominolas-vinagre-manzana`. Precio incorrecto y producto incorrecto enviado.

El propio `src/data/catalog.ts` ya advertía de esta colisión en el comentario
de `findBundleByIdAcrossCatalog`.

### 1.2 La causa de fondo: `bundle.id` hace tres trabajos a la vez

`bundle.id` se usa como identificador, como multiplicador de cantidad y como
orden de presentación. De ahí sale casi todo lo demás:

| Sitio | Código | Qué asume |
|---|---|---|
| `BundleSelection/index.tsx:42` | `BASE_UNIT_PRICE_EUR * bundle.id` | id == cantidad |
| `BundleSelection/index.tsx:111` | `bundle.id > 1` | id 1 == pack pequeño |
| `BundleSelection/index.tsx:17` | `useState<BundleId>(2)` | existe un id 2 global |
| `BundleSelection/data.ts:13-15` | `if (bundle.id === 1) return "1 Bote — Pruébalo"` | ids 1/2/3 fijos |
| `QuickProductPreviewModal:385,477` | `29.99 * bundle.id` | precio del vinagre, a mano |
| `ProductCard:369` | `29.99 * selectedBundle.id` | ídem |
| `api/create-payment-intent:15` | `z.number().int().min(1).max(3)` | solo existen 3 bundles |

**Trampa para el refactor:** con los ids 4/5/6 del jengibre,
`BASE_UNIT_PRICE_EUR * bundle.id` daría un precio tachado de **119,96 €** en su
pack de 1 bote. Hoy no se ve porque la ficha pinta los bundles del vinagre; en
cuanto se hagan por producto, aparece. Hay que quitar esas fórmulas, no
adaptarlas.

### 1.3 El tercer fallo: selección de bundle global

`getStoredBundle()` (en `components/checkout/OrderSummary.tsx`) lee la clave
de localStorage `selectedBundle` — **una sola para toda la tienda** — y busca
el id en la lista global `BUNDLES`. `sections/CheckoutActions/index.tsx` la
llama sin saber en qué ficha de producto está. Es el camino directo a cobrar
el producto equivocado desde la ficha del jengibre.

---

## 2. Decisiones tomadas por el propietario

### Decisión 1 — Meta CAPI: se mantiene el ID numérico

No se toca el catálogo de Meta. Hacia Meta se sigue enviando `bundle.id` como
`content_ids` (`"2"`, `"5"`…), igual que hoy, para no romper la
correspondencia ni el histórico de atribución.

**Consecuencia de diseño, importante:** el identificador interno pasa a ser
`sku`, pero `bundle.id` **sigue siendo un identificador externo con
significado**, así que debe seguir siendo **único en todo el catálogo**. La
comprobación de unicidad al arrancar tiene que cubrir **`sku` y `id`**, no
solo `sku`.

Reparto de responsabilidades que queda:

| Identificador | Ámbito | Uso |
|---|---|---|
| `sku` (string) | interno | resolver qué se compra, en carrito y bundle único |
| `id` (number) | externo | `content_ids` hacia Meta Pixel/CAPI, nada más |
| `product_slug` | interno + BD | clave de `product_stock` y de `order_items` |

En el `metadata` del PaymentIntent se guardarán **ambos**: `sku` para trazar
internamente, y `content_ids` numérico para que el webhook siga alimentando a
Meta como hasta ahora, sin cambios en `sendPurchaseCAPI`.

### Decisión 2 — Carritos persistidos: purgar, no migrar

Los carritos guardados en el navegador de clientes (redux-persist) no tienen
`sku`; intentar re-resolverlos por nombre reintroduciría justo la ambigüedad
que este trabajo elimina.

Implementación: en `src/lib/store.ts`, subir `version` de `1` a `2` y añadir
una migración que descarta el estado anterior:

```ts
const persistConfig = {
  key: "root",
  storage,
  version: 2,                 // era 1
  whitelist: ["carts"],
  // Los carritos v1 guardan los items sin `sku`, así que no se pueden
  // resolver sin ambigüedad. Se descartan a propósito: es preferible un
  // carrito vacío a cobrar el producto equivocado.
  migrate: async () => undefined,
};
```

Además hay que borrar la clave antigua `selectedBundle` de localStorage (queda
en formato global `{id}`), porque el formato nuevo es por producto.

Efecto para el usuario final: quien tuviera un carrito a medias lo verá vacío
tras el despliegue. Aceptado.

### Decisión 3 — Nombres de bundle cualificados con el producto

En el carrito debe verse `"Gominolas de Vinagre de Manzana — 2 Botes"`, no
`"2 Botes"` a secas.

**Se implementa como nombre derivado, no duplicando el texto en
`catalog.ts`.** En el catálogo el bundle sigue llamándose `"2 Botes"`, y se
añade un helper:

```ts
export function getBundleDisplayName(
  producto: CatalogProduct,
  bundle: CatalogBundle,
): string {
  return `${producto.nombre} — ${bundle.nombre}`;
}
```

Motivo: si el nombre completo se escribe a mano en cada bundle, renombrar un
producto obliga a tocar todos sus bundles y cualquier olvido queda visible en
el carrito del cliente. Derivándolo, el nombre no puede desincronizarse. El
resultado visible es exactamente el pedido.

Ese nombre cualificado es el que se guarda en `attributes[0]` del item del
carrito — que a partir de ahora es **solo para mostrar**, porque quien
identifica el producto es el `sku`.

---

## 3. El identificador único: formato exacto

Campo **`sku`** en cada bundle de `src/data/catalog.ts`, **escrito a mano**:

```ts
bundles: [
  { sku: "gominolas-vinagre-manzana-x1", id: 1, cantidad: 1, nombre: "1 Bote",  precio: 29.99 },
  { sku: "gominolas-vinagre-manzana-x2", id: 2, cantidad: 2, nombre: "2 Botes", precio: 49.99, precioOriginal: 59.98, popular: true },
  { sku: "gominolas-vinagre-manzana-x3", id: 3, cantidad: 3, nombre: "3 Botes", precio: 59.99, precioOriginal: 89.97 },
]
```

Convención: `<product-slug>-x<cantidad>`.

**Por qué explícito y no calculado:** este identificador acaba escrito en filas
de `order_items` que ya no se pueden reescribir. Si se derivara de `slug` o de
`cantidad`, editar cualquiera de esos campos cambiaría en silencio el
identificador de un bundle ya vendido. Escribiéndolo a mano, cambiarlo es un
acto deliberado y visible en el diff.

**Por qué no "posición en el array":** reordenar los packs en la UI
reasignaría identificadores de pedidos históricos.

**Validación al arrancar** (en `catalog.ts`, coste cero en runtime):

```ts
// Falla al importar el módulo si hay identificadores repetidos: es
// exactamente el error que provocó que un producto cobrara el precio de otro.
// `id` también debe ser único porque viaja a Meta como content_id (ver
// docs/diseno-catalogo-multi-producto.md, Decisión 1).
const todosLosBundles = CATALOG.flatMap((p) => p.bundles);
assertSinDuplicados(todosLosBundles.map((b) => b.sku), "sku de bundle");
assertSinDuplicados(todosLosBundles.map((b) => b.id),  "id de bundle");
assertSinDuplicados(CATALOG.map((p) => p.slug),        "slug de producto");
assertSinDuplicados(CATALOG.map((p) => p.id),          "id de producto");
```

---

## 4. Los 7 pasos de implementación

Cada paso deja el árbol compilando y la tienda funcionando; el `BUNDLES` global
no se retira hasta el paso 6.

### Paso 1 — `catalog.ts`: añadir `sku` y las comprobaciones

Añadir `sku` a los 6 bundles existentes, el helper `getBundleDisplayName`, las
assertions de unicidad y `findBundleBySku(sku)`. No se borra nada todavía.
Nadie consume aún lo nuevo, así que no puede romper.

### Paso 2 — `bundles.ts`: de constante global a función por producto

`BUNDLES` y `BASE_UNIT_PRICE_EUR` dejan de ser globales. Entran:

- `getBundlesForProduct(slug): Bundle[]`
- `getBaseUnitPrice(producto): number` — el precio del pack de `cantidad === 1`
  de **ese** producto
- `getStrikePrice(producto, bundle): number` — usa `bundle.precioOriginal` si
  existe; si no, `getBaseUnitPrice(producto) * bundle.cantidad`.
  **Sustituye a `BASE_UNIT_PRICE_EUR * bundle.id` y a los `29.99` a mano.**

El `BUNDLES` global se mantiene exportado y marcado como obsoleto para que los
pasos 3-5 puedan migrar de uno en uno.

### Paso 3 — Los 7 consumidores de `BUNDLES`

| # | Archivo | Hoy | Cambio |
|---|---|---|---|
| 1 | `app/shop/product/[...slug]/page.tsx` | `min(BUNDLES)` para "desde X €" | bundles del producto de la ruta |
| 2 | `components/checkout/OrderSummary.tsx` | `getStoredBundle()` global | `getStoredBundle(productSlug)`; clave `selectedBundle:<slug>` guardando `{sku}` |
| 3 | `components/common/ProductCard.tsx` | `BUNDLES[idx]`, `29.99` a mano | bundles de `data`; tachado vía `getStrikePrice` |
| 4 | `components/QuickProductPreviewModal.tsx` | `BUNDLES[idx]`, `29.99 * id` | bundles de `selectedProduct`; ídem |
| 5 | `sections/BundleSelection/data.ts` | `getBundleTitle` con ids 1/2/3 | título desde el propio bundle (campo `titulo` opcional en catálogo) |
| 6 | `sections/BundleSelection/index.tsx` | `BUNDLES.map`, `* bundle.id`, default `2` | recibe `bundles` por prop; por defecto el `popular`, o el primero |
| 7 | `sections/BundleSelection/types.ts` | `BundleId = Bundle["id"]` | `BundleSku = string` |

### Paso 4 — Los tres archivos que rompen sin importar `bundles.ts`

- `sections/CheckoutActions/index.tsx` — pasa a recibir el producto de la ficha
  y llamar a `getStoredBundle(producto.slug)`. **Es el fallo más directo:** hoy
  comprar desde la ficha del jengibre cobraría el vinagre.
- `components/checkout/CheckoutModal.tsx` — envía `sku` en vez de `bundleId`.
- `lib/features/carts/cartsSlice.ts` — `CartItem` gana `sku: string`;
  `attributes[0]` pasa a llevar el nombre cualificado (Decisión 3).

### Paso 5 — Endpoints de pago

- `api/create-payment-intent` (bundle único): el schema pasa de
  `bundleId: z.number().min(1).max(3)` a `sku: z.string()`, validado contra el
  catálogo. Resuelve con `findBundleBySku`. En `metadata` guarda `sku`,
  `productSlug` y `bundleId` (numérico, para Meta — Decisión 1).
- `api/checkout/create-payment-intent` (carrito): resuelve por `item.sku` en
  vez de `attributes[0]`. `buildContentIdsMetadata` sigue recibiendo
  `bundle.id` numérico, sin cambios hacia Meta.
- Se eliminan `findBundleByNameAcrossCatalog` y `findBundleByIdAcrossCatalog`.

Con esto **ambos flujos** resuelven por una clave única: precio correcto y
`product_slug` correcto para descontar stock.

### Paso 6 — Purga del carrito persistido y retirada del global

`store.ts` a `version: 2` con `migrate` que descarta (Decisión 2), borrado de
la clave `selectedBundle` antigua, y retirada del export `BUNDLES` global y de
`BASE_UNIT_PRICE_EUR`.

### Paso 7 — Verificación en local (`npm run dev`)

Con Stripe CLI reenviando el webhook, y stock de ambos productos en
`product_stock`:

1. Pedido de **carrito** del **jengibre**, pack de 2: cobra **44,99 €**, el
   `order_item` sale con `product_slug = gominolas-jengibre`, y baja el stock
   del **jengibre** (−2), no el del vinagre.
2. Pedido de **bundle único** del **jengibre**: mismas comprobaciones.
3. Un pedido de cada uno del **vinagre**, para confirmar que no hay regresión.
4. Carrito con **los dos productos a la vez**: dos `order_items`, cada uno con
   su slug, y stock descontado por separado.
5. `metadata.content_ids` del PaymentIntent sigue siendo numérico.
6. En el carrito se lee `"Gominolas de Jengibre — 2 Botes"`.

> Nota de entorno: el flujo de **bundle único** no se puede validar entero en
> `npm run dev`, porque React StrictMode invoca dos veces el `useEffect` de
> `CheckoutModal` y se crean dos PaymentIntents (el pedido guarda uno y se cobra
> el otro). `next start` tampoco sirve: fuerza redirect a HTTPS en localhost.
> Para ese flujo hay que verificar contra un despliegue de preview, o arreglar
> antes el guard de caché de `CheckoutModal.tsx:667` (ver §6).

---

## 5. `product_stock`: no necesita cambios

La clave `product_slug` sigue siendo correcta: el stock es del **producto**, no
del bundle — un pack de 2 descuenta 2 unidades del mismo inventario, que es lo
que ya calcula `unidades_stock = bundle.cantidad × quantity`. El endpoint de
carrito ya agrupa por slug cuando varias líneas apuntan al mismo producto.

Lo único que exige cada producto nuevo es su fila:

```sql
INSERT INTO product_stock (product_slug, stock)
VALUES ('gominolas-jengibre', 100)
ON CONFLICT (product_slug) DO NOTHING;
```

Solo haría falta extender la clave si algún producto llegara a tener variantes
con inventario separado (sabores, tallas). Hoy no aplica.

---

## 6. Riesgos conocidos y trabajo adyacente

- **`CheckoutModal.tsx:667`** — el guard de caché del `clientSecret` se puebla
  después de que resuelva el `fetch`, así que una doble invocación crea dos
  PaymentIntents y el pedido queda apuntando al que no se cobró. Es
  preexistente y no forma parte de este trabajo, pero **impide verificar el
  flujo de bundle único en local**. Conviene arreglarlo antes o en paralelo.
- **`AÑADIR-PRODUCTO.md` está desactualizado**: afirma que basta con editar
  `catalog.ts` y que no hay que tocar ningún componente. Era cierto con un solo
  producto. Hay que reescribirlo al terminar, incluyendo el campo `sku`.
- **`products.ts`** ya se corrigió en el commit `03480e6` de esta rama para
  mapear todo el catálogo (antes solo exponía `CATALOG[0]`, así que el producto
  nuevo no existía para `/shop`, la home, el sitemap ni `generateStaticParams`).

---

## 7. Datos inventados en el producto de prueba, pendientes de revisión

El propietario aportó nombre, slug, precios, descripción corta, categoría y
stock. Lo siguiente lo rellenó Claude y **está pendiente de aprobación**:

| Campo | Valor actual | Origen |
|---|---|---|
| `descripcion` (larga) | "Gominolas naturales elaboradas con jengibre. Favorecen la digestión…" | inventado, copiando el patrón del vinagre |
| `metaTitle` | "Gominolas de Jengibre \| Natural y Vegano" | inventado |
| `metaDescription` | "Compra gominolas de jengibre natural. Favorecen la digestión y aportan energía. Envío gratis." | inventado |
| `precioOriginal` | 49,98 (2 botes) y 74,97 (3 botes) | derivado: 24,99 × cantidad |
| `popular: true` | en "2 Botes" | copiado del vinagre, no se pidió |
| `imagenes` | `["/images/FL1.png"]` | **placeholder: es el bote de vinagre** |
| nombres de bundle | "1 Bote" / "2 Botes" / "3 Botes" | reutilizados — causa de la colisión |

No existe ningún campo `precio_por_unidad`: el "Solo 25,00 €/bote" que aparece
en la UI es calculado (`calcUnitPrice` = precio ÷ cantidad), no un dato
almacenado.

**Falta material real:** no hay ninguna fotografía de jengibre en
`public/images/`. El producto necesita al menos una imagen propia; el producto
existente usa cuatro.
