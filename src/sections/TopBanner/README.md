# TopBanner

Banner superior de oferta con countdown y botón de cierre.

## Props

Ninguna — texto y duración hardcodeados en `index.tsx`. Candidato a
`{ message, durationMinutes }` por props (Fase 2).

## Dependencias externas

- `localStorage` (recuerda el cierre del banner) — interno y portable.
- Primitivo `Button` de `@/components/ui`.
- Sin store, sin fetch: copy-paste directo.

## Uso

```tsx
import TopBanner from "@/sections/TopBanner";
<TopBanner />  // en el layout raíz, antes del navbar
```
