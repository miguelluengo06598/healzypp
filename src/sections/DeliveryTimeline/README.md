# DeliveryTimeline

Barra compacta de la ficha de producto: "si compras antes de las 14:00h
recibirás tu pedido el {fecha}" + countdown + mini-pasos de envío.

## Archivos

- `index.tsx` — el componente
- `useDeliveryCountdown.ts` — hook exclusivo (hora de corte, fines de semana,
  cálculo de fecha); viaja con la sección

## Props

Ninguna — hora de corte (14:00) y plazos definidos en el hook. Candidato a
`{ cutoffHour, deliveryDays }` por props (Fase 2).

## Dependencias externas

Solo `@/lib/utils` (cn). Sin store, sin fetch: autocontenida.

Nota de honestidad: los mini-pasos inferiores (Conf/Prep/Env/Ent) son
ilustrativos del proceso, con estados fijos — no reflejan un pedido real
(en la ficha aún no existe pedido). La fecha prometida sí se calcula de
verdad. Si el plazo real de envío cambia, actualizar el hook Y la página
/terms (hoy: 2-5 días laborables).

## Uso

```tsx
import DeliveryTimeline from "@/sections/DeliveryTimeline";
<DeliveryTimeline />
```
