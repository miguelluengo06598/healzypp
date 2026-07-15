# CookieBanner

Banner de consentimiento de cookies (técnicas vs. análisis) con "Aceptar todas"
y "Solo esenciales".

## Props

Ninguna — textos hardcodeados en `index.tsx`.

## Dependencias externas

- **`@/hooks/useCookieConsent`** — NO viaja con esta sección: el hook es
  compartido con el sistema de tracking (`MetaPixel.tsx`, `useMetaPixel.ts`),
  que lee el consentimiento antes de disparar píxeles. Al copiar esta sección
  a otro proyecto, copiar también el hook y conectar el gating de analytics
  al mismo consentimiento — el banner sin ese gating es solo decoración
  (cumplimiento RGPD falso).

## Uso

```tsx
import CookieBanner from "@/sections/CookieBanner";
<CookieBanner />  // en el layout raíz
```
