import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = {
  question: string;
  answer: string;
};

const faqsData: FaqItem[] = [
  {
    question: "¿De qué están hechas las gominolas?",
    answer:
      "Nuestras gominolas están elaboradas con vinagre de manzana orgánico certificado, pectina de manzana, zumo de frutas naturales y sin colorantes ni conservantes artificiales. Son aptas para veganos y sin gluten.",
  },
  {
    question: "¿Cuántas gominolas debo tomar al día?",
    answer:
      "La dosis recomendada es de 2 gominolas al día, preferiblemente por la mañana antes del desayuno. No superes la dosis diaria recomendada.",
  },
  {
    question: "¿Tienen azúcar las gominolas?",
    answer:
      "No contienen azúcar añadido. Están endulzadas de forma natural con eritritol y stevia, lo que las hace aptas para personas que controlan su ingesta de azúcar.",
  },
  {
    question: "¿Cuánto tiempo tarda en verse resultados?",
    answer:
      "Los resultados varían según cada persona. La mayoría de nuestros clientes notan mejoras en la digestión en las primeras 2-3 semanas de uso continuado. Para resultados óptimos, se recomienda un consumo mínimo de 4 semanas.",
  },
  {
    question: "¿Cuáles son los plazos y costes de envío?",
    answer:
      "El envío es gratuito en pedidos superiores a 30€. Los pedidos se entregan en 3-5 días hábiles en la Península. Para Canarias, Baleares y Portugal, el plazo puede ser de 5-7 días hábiles.",
  },
  {
    question: "¿Cuál es la política de devoluciones?",
    answer:
      "Aceptamos devoluciones en los 30 días siguientes a la recepción del producto, siempre que esté sin abrir y en su embalaje original. Contacta con nuestro servicio de atención al cliente para iniciar el proceso.",
  },
];

const FaqContent = () => {
  return (
    <section>
      <h3 className="text-xl sm:text-2xl font-bold text-black mb-5 sm:mb-6">
        Preguntas frecuentes
      </h3>
      <Accordion type="single" collapsible>
        {faqsData.map((faq, idx) => (
          <AccordionItem key={idx} value={`item-${idx + 1}`}>
            <AccordionTrigger className="text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FaqContent;
