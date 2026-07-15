import React from "react";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { FaLeaf, FaCheckCircle, FaRegClock } from "react-icons/fa";
import type { IconType } from "react-icons";

// ─────────────────────────────────────────────────────────────────────────────
// Sección "Por qué recomendamos este producto"
//
// Sustituye a la antigua sección de reseñas de clientes: aquellas reseñas
// (productReviewsData) eran testimonios inventados con badge de "Compra
// verificada" — social proof falso. Esta sección se basa solo en hechos
// reales del producto. Cuando existan reseñas reales de clientes, puede
// añadirse una sección de reseñas de nuevo (con datos verificables).
// ─────────────────────────────────────────────────────────────────────────────

type ReasonBlock = {
  icon: IconType;
  title: string;
  body: string;
};

const REASONS: ReasonBlock[] = [
  {
    icon: FaLeaf,
    title: "Ingredientes que hablan por sí solos",
    body:
      "Elaboradas con vinagre de manzana orgánico, sin aditivos innecesarios. 60 gominolas por bote, pensadas para tomar cada día sin complicarte.",
  },
  {
    icon: FaCheckCircle,
    title: "Aptas para (casi) todo el mundo",
    body:
      "100% veganas y sin gluten — puedes tomarlas sin preocuparte por restricciones alimentarias.",
  },
  {
    icon: FaRegClock,
    title: "Un hábito, no una promesa milagro",
    body:
      "El vinagre de manzana es conocido por su papel tradicional en el apoyo a la digestión. No prometemos milagros: es un complemento a un estilo de vida saludable, no un sustituto.",
  },
];

function ReasonCard({ reason }: { reason: ReasonBlock }) {
  const Icon = reason.icon;
  return (
    <article className="flex flex-col h-full bg-white border border-black/10 rounded-[20px] p-5 md:p-6 shadow-sm">
      <div className="w-11 h-11 rounded-full bg-[#487D26]/10 flex items-center justify-center mb-4">
        <Icon className="text-[#487D26] text-lg" aria-hidden="true" />
      </div>
      <h3 className="font-bold text-black text-base md:text-lg leading-tight mb-2">
        {reason.title}
      </h3>
      <p className="text-black/70 text-sm leading-relaxed">{reason.body}</p>
    </article>
  );
}

export default function CustomerReviews() {
  return (
    <section className="max-w-frame mx-auto px-4 xl:px-0 mb-[50px] sm:mb-20">
      <hr className="h-[1px] border-t-black/10 mb-10 sm:mb-16" />

      <h2
        className={cn([
          integralCF.className,
          "text-[32px] md:text-5xl capitalize mb-10 md:mb-14",
        ])}
      >
        Por qué recomendamos este producto
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {REASONS.map((reason) => (
          <ReasonCard key={reason.title} reason={reason} />
        ))}
      </div>
    </section>
  );
}
