# OrderTimeline

Línea de tiempo de pedido (Confirmado → Pagado → Enviado → Entregado) basada
EXCLUSIVAMENTE en datos reales: una etapa solo se marca completada si hay señal
en `orders.estado` o en filas de `order_tracking`. Sin simulación temporal, sin
countdowns, sin fechas estimadas fabricadas. Estados terminales (fallido/
cancelado/reembolsado) se muestran como banner, no como progresión.

## Archivos

- `index.tsx` — el componente (client)
- `microinteractions.ts` — configs de animación exclusivas; viajan con la sección

## Props (todas serializables — se puede montar desde un server component)

- `estado: OrderStatusEnum` — estado real del pedido
- `confirmedAt: string` — fecha de creación (ISO)
- `paidAt?: string | null` — fecha de pago si la hay
- `trackingEvents?: { estado, descripcion, numero_tracking, empresa_envio, fecha_creacion }[]`

## Dependencias externas

`@/lib/utils` (cn), fuente `integralCF`, tipo `OrderStatusEnum` de
`@/types/database.types` (o redefinir el union al copiar). Sin store, sin fetch.

## Uso

```tsx
import OrderTimeline from "@/sections/OrderTimeline";
<OrderTimeline
  estado={order.estado}
  confirmedAt={order.fecha_creacion}
  paidAt={order.fecha_actualizacion}
  trackingEvents={order.order_tracking}
/>
```
