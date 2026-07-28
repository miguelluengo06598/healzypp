import React from "react";
import { FooterLinks } from "./types";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Solo enlaces que llevan a una página real. Antes había cuatro columnas con
// 17 enlaces, de los que 14 apuntaban a "#": "atención al cliente", "empleo",
// "eBooks gratuitos"… Un cliente que buscaba ayuda hacía clic y no pasaba
// nada, que es peor que no ofrecerlo. Varios además prometían cosas que SÍ
// existen ("mi cuenta", "gestionar pedidos") pero sin enlazarlas.
//
// Antes de añadir uno nuevo aquí: comprueba que la ruta existe de verdad.
const footerLinksData: FooterLinks[] = [
  {
    id: 1,
    title: "tienda",
    children: [
      { id: 11, label: "catálogo", url: "/shop" },
      { id: 12, label: "mi pedido", url: "/seguimiento" },
      { id: 13, label: "contacto", url: "/contact" },
      { id: 14, label: "mi cuenta", url: "/account/profile" },
    ],
  },
  {
    id: 2,
    title: "legal",
    children: [
      { id: 21, label: "términos y condiciones", url: "/terms" },
      { id: 22, label: "política de privacidad", url: "/privacy" },
      { id: 23, label: "aviso legal", url: "/aviso-legal" },
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
              className={cn(["capitalize", "text-black/60 text-sm md:text-base mb-4 w-fit"])}
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
