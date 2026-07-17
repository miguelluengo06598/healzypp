import Image from "next/image";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import CustomerReviews from "@/sections/CustomerReviews";
import {
  defaultBenefits,
  defaultSteps,
  defaultInfoBlocks,
  type BenefitItem,
  type StepItem,
  type InfoBlock,
} from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// ProductSections — sección pura. El contenido vive en ./data.ts (defaults) o
// llega por props; el envoltorio de tracking se inyecta vía SectionWrapper
// (por defecto, sin tracking) para no acoplar la sección al analytics de
// este proyecto.
// ─────────────────────────────────────────────────────────────────────────────

type SectionWrapperType = React.ComponentType<{
  section: string;
  children: React.ReactNode;
}>;

const PlainWrapper: SectionWrapperType = ({ children }) => <>{children}</>;

interface ProductSectionsProps {
  benefits?: BenefitItem[];
  steps?: StepItem[];
  infoBlocks?: InfoBlock[];
  /** Esta tienda inyecta el ProductSectionWrapper de tracking desde la página */
  SectionWrapper?: SectionWrapperType;
}

export default function ProductSections({
  benefits = defaultBenefits,
  steps = defaultSteps,
  infoBlocks = defaultInfoBlocks,
  SectionWrapper = PlainWrapper,
}: ProductSectionsProps) {
  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — BENEFICIOS
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionWrapper section="beneficios">
      <section className="max-w-frame mx-auto px-4 xl:px-0 mb-[50px] sm:mb-20">
        <hr className="h-[1px] border-t-black/10 mb-10 sm:mb-16" />

        <h2
          className={cn([
            integralCF.className,
            "text-[32px] md:text-5xl mb-8 md:mb-14 text-center capitalize",
          ])}
        >
          ¿Por qué elegir nuestro producto?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {benefits.map((benefit) => (
            <div
              key={benefit.id}
              className="border border-black/10 rounded-[20px] p-5 md:p-6 flex flex-col"
            >
              <div className="relative rounded-[13px] aspect-square mb-4 overflow-hidden bg-[#F0EEED]">
                <Image
                  src={benefit.image}
                  alt={benefit.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>

              <strong className="text-black text-lg mb-2">{benefit.title}</strong>

              <p className="text-black/60 text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — 3 PASOS PARA MEJORAR TU SALUD
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionWrapper section="descripcion">
      <section className="max-w-frame mx-auto px-4 xl:px-0 mb-[50px] sm:mb-20">
        <hr className="h-[1px] border-t-black/10 mb-10 sm:mb-16" />

        <h2
          className={cn([
            integralCF.className,
            "text-[32px] md:text-5xl mb-8 md:mb-14 text-center capitalize",
          ])}
        >
          3 pasos para mejorar tu salud
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col">
              <span
                className={cn([
                  integralCF.className,
                  "text-[80px] md:text-[96px] leading-none text-black/10 mb-2 select-none",
                ])}
              >
                {step.id}
              </span>

              <hr className="h-[1px] border-t-black/10 mb-4" />

              <strong className="text-black text-lg mb-2">{step.title}</strong>

              <p className="text-black/60 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 3 — BLOQUES IMAGEN/TEXTO ALTERNADOS
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionWrapper section="ingredientes">
      <section className="max-w-frame mx-auto px-4 xl:px-0 mb-[50px] sm:mb-20">
        <hr className="h-[1px] border-t-black/10 mb-10 sm:mb-16" />

        <h2
          className={cn([
            integralCF.className,
            "text-[32px] md:text-5xl mb-8 md:mb-14 text-center capitalize",
          ])}
        >
          Todo lo que necesitas saber
        </h2>

        <div className="flex flex-col gap-10 sm:gap-16">
          {infoBlocks.map((block) => (
            <div
              key={block.id}
              className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10 items-center"
            >
              {/* Imagen — alterna izquierda/derecha en desktop */}
              <div
                className={cn([
                  "relative rounded-[20px] aspect-video overflow-hidden bg-[#F0EEED]",
                  "order-1",
                  block.imageRight ? "md:order-2" : "md:order-1",
                ])}
              >
                <Image
                  src={block.image}
                  alt={block.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Texto */}
              <div
                className={cn([
                  "order-2",
                  block.imageRight ? "md:order-1" : "md:order-2",
                ])}
              >
                <h3
                  className={cn([
                    integralCF.className,
                    "text-xl md:text-[28px] md:leading-snug mb-4 capitalize",
                  ])}
                >
                  {block.title}
                </h3>

                <p className="text-black/60 text-sm sm:text-base leading-relaxed">
                  {block.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 4 — RESEÑAS VERIFICADAS DE CLIENTES
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionWrapper section="testimonios">
        <CustomerReviews />
      </SectionWrapper>
    </>
  );
}
