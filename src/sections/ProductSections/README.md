# ProductSections

Secciones de marketing de la ficha de producto: beneficios (3 tarjetas), pasos
de uso (3 columnas), bloques imagen/texto alternados y reseñas. Sección pura:
el contenido vive en `./data.ts` (defaults de la tienda) o llega por props, y el
envoltorio de tracking se inyecta vía `SectionWrapper` (por defecto ninguno).

## Props

- `benefits?: BenefitItem[]` — tarjetas de beneficios (default: `defaultBenefits`)
- `steps?: StepItem[]` — pasos de uso (default: `defaultSteps`)
- `infoBlocks?: InfoBlock[]` — bloques imagen/texto (default: `defaultInfoBlocks`)
- `SectionWrapper?` — componente `{ section: string; children }` que envuelve
  cada sección. En esta tienda: `ProductSectionWrapper` de
  `@/components/tracking` (emite `product_section_view`). Sin él, las
  secciones renderizan sin tracking.

## Dependencias externas

`CustomerReviews` de `@/sections/CustomerReviews` (sección 4), fuente
`integralCF`, `next/image`. Sin store, sin fetch.

## Uso

```tsx
<ProductSections SectionWrapper={ProductSectionWrapper} />
// o con contenido propio:
<ProductSections benefits={misBeneficios} steps={misPasos} />
```
