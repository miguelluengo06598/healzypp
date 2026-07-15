# Footer

Pie de página completo: marca + descripción, iconos de redes sociales, columnas
de enlaces, badges de pago (Visa/Mastercard/PayPal/Apple Pay/Google Pay) y
sección de newsletter.

## Archivos

- `index.tsx` — el componente principal
- `LinksSection.tsx` — columnas de enlaces
- `NewsLetterSection.tsx` — CTA de suscripción (solo UI, sin backend conectado)
- `LayoutSpacing.tsx` — espaciador inferior
- `types.ts` — `SocialNetworks`, `FooterLinks`, `PaymentBadge`

## Props

Ninguna todavía — el contenido (redes, links, badges) está hardcodeado dentro
de `index.tsx`. Candidato a recibirlo por props con estos valores como default
(pendiente, Fase 2 de la migración a secciones).

## Dependencias externas

- Primitivos de `@/components/ui` (`Button`, `InputGroup`) — copiarlos junto a
  la sección en otro proyecto.
- Fuente `integralCF` de `@/styles/fonts`.
- SVGs de `/public/icons/` (Visa.svg, mastercard.svg, paypal.svg, applePay.svg,
  googlePay.svg) — copiar también.
- Sin store, sin fetch, sin contexto: copy-paste directo.

## Uso

```tsx
import Footer from "@/sections/Footer";
<Footer />
```
