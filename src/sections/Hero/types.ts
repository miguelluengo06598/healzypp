export type HeroStat = {
  value: number;
  suffix: string;
  label: string;
};

export type HeroCta = {
  label: string;
  href: string;
};

export interface HeroProps {
  /** Texto del badge superior (p. ej. "Novedad 2026") */
  badgeLabel?: string;
  /** Parte del titular SIN resaltar */
  headline?: string;
  /** Parte del titular con el subrayado de marca */
  headlineHighlight?: string;
  description?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  stats?: HeroStat[];
  heroImage?: { src: string; alt: string };
  /** Mini-card flotante inferior-izquierda */
  miniCard?: { imageSrc: string; imageAlt: string; title: string; subtitle: string };
}
