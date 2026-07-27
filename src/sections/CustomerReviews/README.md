# CustomerReviews

Sección honesta de reseñas de la ficha de producto: no muestra reseñas
inventadas ni ratings placeholder — sustituyó al antiguo sistema de
`DUMMY_REVIEWS` fabricadas.

## Props

Ninguna — contenido estático honesto. Cuando existan reseñas reales
(tabla `reviews` de Supabase, con `aprobado=true`), esta sección es el punto
donde conectarlas.

## Dependencias externas

Solo `@/lib/utils` (cn) y fuente `integralCF`. Sin store, sin fetch.

## Uso

```tsx
import CustomerReviews from "@/sections/CustomerReviews";
<CustomerReviews />
```
