import Image from "next/image";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import CustomerReviews from "./CustomerReviews";
import ProductSectionWrapper from "@/components/tracking/ProductSectionWrapper";

// ─────────────────────────────────────────────────────────────────────────────
// ProductSections
// ─────────────────────────────────────────────────────────────────────────────

// ─── Sección 1: Beneficios ────────────────────────────────────────────────────
const benefits = [
  {
    id: 1,
    title: "Mejora la digestión",
    description:
      "El vinagre de manzana ayuda a equilibrar el pH del estómago y favorece el crecimiento de bacterias beneficiosas, mejorando el tránsito intestinal de forma natural.",
    image: "/images/MEJORALADIGESTION.png",
  },
  {
    id: 2,
    title: "Aumenta la energía",
    description:
      "Los ácidos orgánicos del vinagre de manzana contribuyen a una liberación de energía más sostenida a lo largo del día, sin los picos de azúcar de otras alternativas.",
    image: "/images/AUMENTALAENERGIAVINDEMAN.png",
  },
  {
    id: 3,
    title: "Controla el peso",
    description:
      "Estudios sugieren que el ácido acético ayuda a reducir el apetito y a regular el metabolismo de los lípidos, apoyando un peso corporal saludable.",
    image: "/images/CONTROLDEPESOVINDEMAN.png",
  },
];

// ─── Sección 2: Pasos ─────────────────────────────────────────────────────────
const steps = [
  {
    id: 1,
    title: "Toma 2 gominolas al día",
    description:
      "Consume 2 gominolas por la mañana, preferiblemente antes del desayuno, para aprovechar al máximo sus propiedades digestivas.",
  },
  {
    id: 2,
    title: "Mastica despacio",
    description:
      "Mastica cada gominola lentamente para que el vinagre de manzana se libere de forma gradual y tu cuerpo lo asimile correctamente.",
  },
  {
    id: 3,
    title: "Mantén la constancia",
    description:
      "Los mejores resultados se obtienen con un consumo regular. Incorpora las gominolas a tu rutina diaria durante al menos 4 semanas.",
  },
];

// ─── Sección 3: Bloques imagen/texto ──────────────────────────────────────────
const infoBlocks = [
  {
    id: 1,
    title: "Ingredientes 100 % naturales",
    description:
      "Nuestras gominolas están elaboradas con vinagre de manzana orgánico certificado, sin colorantes artificiales ni conservantes. Cada unidad aporta la misma cantidad de ácido acético que un vasito de vinagre, pero con un sabor agradable y sin el ardor. Aptas para veganos y sin gluten.",
    image: "/images/PRODUCTOSNATURALES.png",
    imageAlt: "Ingredientes naturales de las gominolas",
    imageRight: false,
  },
  {
    id: 2,
    title: "Fabricación artesanal y sostenible",
    description:
      "Cada lote se produce en pequeñas cantidades para garantizar la máxima calidad. Utilizamos envases reciclables y reducimos al mínimo nuestra huella de carbono. Trabajamos con productores locales de manzana para apoyar la economía de proximidad y asegurar la frescura de las materias primas.",
    image: "/images/FABRICACIONARTESANALVINDEMAN.png",
    imageAlt: "Proceso de fabricación artesanal",
    imageRight: true,
  },
  {
    id: 3,
    title: "Respaldado por la ciencia",
    description:
      "El vinagre de manzana ha sido objeto de numerosos estudios clínicos que avalan sus beneficios sobre la glucemia, el colesterol y la microbiota intestinal. Nuestras gominolas ofrecen una dosis estandarizada y reproducible para que puedas confiar en cada toma. Consulta con tu médico si tomas medicación.",
    image: "/images/doctorvindeman.png",
    imageAlt: "Respaldo científico del producto",
    imageRight: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductSections() {
  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — BENEFICIOS
      ════════════════════════════════════════════════════════════════════════ */}
      <ProductSectionWrapper section="beneficios">
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
      </ProductSectionWrapper>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — 3 PASOS PARA MEJORAR TU SALUD
      ════════════════════════════════════════════════════════════════════════ */}
      <ProductSectionWrapper section="descripcion">
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
      </ProductSectionWrapper>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 3 — BLOQUES IMAGEN/TEXTO ALTERNADOS
      ════════════════════════════════════════════════════════════════════════ */}
      <ProductSectionWrapper section="ingredientes">
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
      </ProductSectionWrapper>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 4 — RESEÑAS VERIFICADAS DE CLIENTES
      ════════════════════════════════════════════════════════════════════════ */}
      <ProductSectionWrapper section="testimonios">
        <CustomerReviews />
      </ProductSectionWrapper>
    </>
  );
}
