// Contenido HEALZYP por defecto para la sección Hero.
// Este archivo ES el punto de adaptación: al copiar la sección a otro
// proyecto, se reescribe data.ts (o se pasan props) sin tocar index.tsx.
import { newArrivalsData } from "@/data/products";
import type { HeroProps } from "./types";

export const heroDefaults: Required<HeroProps> = {
  badgeLabel: "Novedad 2026",
  headline: "Bienestar real",
  headlineHighlight: "para tu día a día",
  description:
    "Suplementos naturales diseñados para mejorar tu bienestar sin complicaciones. Calidad premium, resultados reales.",
  primaryCta: { label: "Comprar Ahora", href: "/shop" },
  secondaryCta: { label: "Descubrir", href: "/shop#new-arrivals" },
  stats: [
    { value: 100, suffix: "%", label: "Ingredientes Naturales" },
    { value: 2000, suffix: "+", label: "Clientes Satisfechos" },
    { value: 30, suffix: "", label: "Días de devolución" },
  ],
  heroImage: {
    src: "/images/FOTOVINDEMANPORT.png",
    alt: "Gominolas de vinagre de manzana HEALZYP",
  },
  miniCard: {
    imageSrc: newArrivalsData[0]?.srcUrl ?? "/images/FL1.png",
    imageAlt: newArrivalsData[0]?.title ?? "Producto destacado",
    title: "Más vendido",
    subtitle: "Desde €29",
  },
};
