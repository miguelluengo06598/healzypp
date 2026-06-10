import React from "react";
import { FooterLinks } from "./footer.types";
import Link from "next/link";
import { cn } from "@/lib/utils";

const footerLinksData: FooterLinks[] = [
  {
    id: 1,
    title: "empresa",
    children: [
      {
        id: 11,
        label: "sobre nosotros",
        url: "#",
      },
      {
        id: 12,
        label: "características",
        url: "#",
      },
      {
        id: 13,
        label: "cómo funciona",
        url: "#",
      },
      {
        id: 14,
        label: "empleo",
        url: "#",
      },
    ],
  },
  {
    id: 2,
    title: "ayuda",
    children: [
      {
        id: 21,
        label: "atención al cliente",
        url: "#",
      },
      {
        id: 22,
        label: "detalles de envío",
        url: "#",
      },
      {
        id: 23,
        label: "términos y condiciones",
        url: "/terms",
      },
      {
        id: 24,
        label: "política de privacidad",
        url: "/privacy",
      },
      {
        id: 25,
        label: "aviso legal",
        url: "/aviso-legal",
      },
    ],
  },
  {
    id: 3,
    title: "preguntas frecuentes",
    children: [
      {
        id: 31,
        label: "mi cuenta",
        url: "#",
      },
      {
        id: 32,
        label: "gestionar pedidos",
        url: "#",
      },
      {
        id: 33,
        label: "pedidos",
        url: "#",
      },
      {
        id: 34,
        label: "pagos",
        url: "#",
      },
    ],
  },
  {
    id: 4,
    title: "recursos",
    children: [
      {
        id: 41,
        label: "eBooks gratuitos",
        url: "#",
      },
      {
        id: 42,
        label: "tutorial de salud",
        url: "#",
      },
      {
        id: 43,
        label: "Blog de consejos",
        url: "#",
      },
      {
        id: 44,
        label: "lista de reproducción",
        url: "#",
      },
    ],
  },
];

const LinksSection = () => {
  return (
    <>
      {footerLinksData.map((item) => (
        <section className="flex flex-col mt-5" key={item.id}>
          <h3 className="font-medium text-sm md:text-base uppercase tracking-widest mb-6">
            {item.title}
          </h3>
          {item.children.map((link) => (
            <Link
              href={link.url}
              key={link.id}
              className={cn([
                link.id !== 41 && link.id !== 43 && "capitalize",
                "text-black/60 text-sm md:text-base mb-4 w-fit",
              ])}
            >
              {link.label}
            </Link>
          ))}
        </section>
      ))}
    </>
  );
};

export default LinksSection;
