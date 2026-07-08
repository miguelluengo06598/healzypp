# Sistema de Tracking y Analytics

## Instalación rápida

### 1. Aplicar schema SQL

Ejecuta `database/tracking-schema.sql` en el SQL Editor de Supabase.

### 2. Añadir TrackingProvider al layout

```tsx
// src/app/layout.tsx
import { TrackingProvider } from '@/components/tracking/TrackingProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TrackingProvider>
          {children}
        </TrackingProvider>
      </body>
    </html>
  )
}
```

### 3. Trackear productos

```tsx
import { ProductTracker } from '@/components/tracking/ProductTracker'

<ProductTracker productId={1} productSlug="gominolas-vinagre-manzana">
  <ProductCard ... />
</ProductTracker>
```

### 4. Trackear carrito

```tsx
import { useCartTracker } from '@/hooks/useCartTracker'

function AddToCartButton({ product, bundle }) {
  const { trackAddToCart } = useCartTracker()

  return (
    <button
      onClick={() => {
        addToCart(product, bundle)
        trackAddToCart(
          { productId: product.id, bundleId: bundle.id, quantity: 1, unitPrice: bundle.price },
          getCartTotal()
        )
      }}
    >
      Añadir al carrito
    </button>
  )
}
```

### 5. Trackear checkout y conversión

```tsx
import { getTrackingClient } from '@/lib/tracking-client'

const client = getTrackingClient()

// Inicio checkout
client.track({ eventType: 'checkout_start', url: window.location.href, cartTotal, itemsCount })

// Compra completada
client.track({
  eventType: 'conversion',
  url: window.location.href,
  orderId: order.id,
  orderNumber: order.order_number,
  totalAmount: order.total,
  itemsCount: order.items.length,
  paymentMethod: order.payment_method,
})
```

### 6. Endpoint de analytics en vivo

```bash
curl /api/analytics/live
```

Devuelve sesiones activas, top páginas, top productos y funnel de conversión.
