import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import React from "react";
import { PaymentBadge, SocialNetworks } from "./types";
import { FaFacebookF, FaGithub, FaInstagram, FaTwitter } from "react-icons/fa";
import Link from "next/link";
import LinksSection from "./LinksSection";
import Image from "next/image";
import NewsLetterSection from "./NewsLetterSection";
import LayoutSpacing from "./LayoutSpacing";
import { SITE_NAME } from "@/lib/site";

// Vacío a propósito. Los tres iconos que había (X, Facebook, Instagram)
// apuntaban a twitter.com, facebook.com e instagram.com: los dominios
// genéricos, no a ningún perfil de la tienda. Quien los pulsaba acababa en la
// portada de la red social.
//
// Para reactivarlos basta con añadir aquí las URL reales de los perfiles; el
// bloque de abajo ya no renderiza nada si la lista está vacía.
const socialsData: (SocialNetworks & { name: string })[] = [];

const paymentBadgesData: (PaymentBadge & { name: string })[] = [
  {
    id: 1,
    srcUrl: "/icons/Visa.svg",
    name: "Visa",
  },
  {
    id: 2,
    srcUrl: "/icons/mastercard.svg",
    name: "Mastercard",
  },
  {
    id: 3,
    srcUrl: "/icons/paypal.svg",
    name: "PayPal",
  },
  {
    id: 4,
    srcUrl: "/icons/applePay.svg",
    name: "Apple Pay",
  },
  {
    id: 5,
    srcUrl: "/icons/googlePay.svg",
    name: "Google Pay",
  },
];

const Footer = () => {
  return (
    <footer className="mt-10">
      <div className="relative">
        <div className="absolute bottom-0 w-full h-1/2 bg-[#F0F0F0]"></div>
        <div className="px-4">
          <NewsLetterSection />
        </div>
      </div>
      <div className="pt-8 md:pt-[50px] bg-[#F0F0F0] px-4 pb-4">
        <div className="max-w-frame mx-auto">
          <nav className="lg:grid lg:grid-cols-12 mb-8">
            <div className="flex flex-col lg:col-span-3 lg:max-w-[248px]">
              <h1
                className={cn([
                  integralCF.className,
                  "text-[28px] lg:text-[32px] mb-6",
                ])}
              >
                {SITE_NAME}
              </h1>
              <p className="text-black/60 text-sm mb-9">
                Tenemos productos que se adaptan a tu estilo de vida saludable
                y de los que te sentirás orgulloso.
              </p>
              <div className="flex items-center">
                {socialsData.map((social) => (
                  <Link
                    href={social.url}
                    key={social.id}
                    aria-label={`Síguenos en ${social.name}`}
                    className="bg-white hover:bg-[#487D26] hover:text-white transition-all mr-3 w-7 h-7 rounded-full border border-black/20 flex items-center justify-center p-1.5"
                  >
                    {social.icon}
                  </Link>
                ))}
              </div>
            </div>
            {/* 2 columnas, no 4: quedaron dos secciones tras retirar los
                enlaces que no llevaban a ninguna parte. */}
            <div className="hidden lg:grid col-span-9 lg:grid-cols-2 lg:pl-10">
              <LinksSection />
            </div>
            <div className="grid lg:hidden grid-cols-2">
              <LinksSection />
            </div>
          </nav>

          <hr className="h-[1px] border-t-black/10 mb-6" />
          <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center mb-2">
            <p className="text-sm text-center sm:text-left text-black/60 mb-4 sm:mb-0 sm:mr-1">
              {SITE_NAME}{" "}&copy; {new Date().getFullYear()}. Todos los derechos reservados.
            </p>
            <div className="flex items-center">
              {paymentBadgesData.map((badge, _, arr) => (
                <span
                  key={badge.id}
                  className={cn([
                    arr.length !== badge.id && "mr-3",
                    "w-[46px] h-[30px] rounded-[5px] border-[#D6DCE5] bg-white flex items-center justify-center",
                  ])}
                >
                  <Image
                    priority
                    src={badge.srcUrl}
                    width={33}
                    height={15}
                    style={{ height: "15px", width: "auto" }}
                    alt={badge.name}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
        <LayoutSpacing />
      </div>
    </footer>
  );
};

export default Footer;
