"use client";

import React from "react";
import * as motion from "framer-motion/client";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { FaLeaf, FaCheck, FaHeart } from "react-icons/fa";

const PILLARS = [
  {
    icon: FaLeaf,
    title: "Ingredientes naturales",
    text: "Solo lo mejor para tu cuerpo",
  },
  {
    icon: FaCheck,
    title: "Sin azúcares añadidos",
    text: "Fórmula limpia y vegana",
  },
  {
    icon: FaHeart,
    title: "Apoya tu bienestar",
    text: "Resultados reales, cada día",
  },
];

const HealzypBrand = () => {
  return (
    <div className="px-4 xl:px-0">
      <section className="max-w-frame mx-auto bg-[#F0F0F0] px-6 pb-10 pt-10 md:p-[70px] rounded-[40px] text-center">
        {/* Brand headline */}
        <motion.div
          initial={{ y: "100px", opacity: 0 }}
          whileInView={{ y: "0", opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className={cn(
              integralCF.className,
              "text-[40px] leading-[44px] md:text-[64px] md:leading-[68px] mb-3"
            )}
          >
            HEALZYP
          </h2>
          <p className="text-black/60 text-base md:text-lg mb-2">
            Bienestar real, sin complicaciones.
          </p>
          <p className="text-black/40 text-sm md:text-base mb-10 md:mb-14">
            Suplementos diseñados para tu día a día
          </p>
        </motion.div>

        {/* Three pillars */}
        <motion.div
          initial={{ y: "60px", opacity: 0 }}
          whileInView={{ y: "0", opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-10"
        >
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#487D26]/10 flex items-center justify-center shrink-0">
                <Icon className="text-[#487D26] text-xl" />
              </div>
              <p className={cn(integralCF.className, "text-sm md:text-base")}>
                {title}
              </p>
              <p className="text-xs md:text-sm text-black/50">{text}</p>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
};

export default HealzypBrand;
