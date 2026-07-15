"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IoMdCheckmark } from "react-icons/io";
import { cn } from "@/lib/utils";

const ColorsSection = () => {
  const [selected, setSelected] = useState<string>("bg-green-600");

  return (
    <Accordion type="single" collapsible defaultValue="filter-colors">
      <AccordionItem value="filter-colors" className="border-none">
        <AccordionTrigger className="text-black font-bold text-xl hover:no-underline p-0 py-0.5">
          Colores
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-0">
          <div className="flex space-2.5 flex-wrap md:grid grid-cols-5 gap-2.5">
            {[
              { code: "bg-green-600", name: "Verde" },
              { code: "bg-red-600", name: "Rojo" },
              { code: "bg-yellow-300", name: "Amarillo" },
              { code: "bg-orange-600", name: "Naranja" },
              { code: "bg-cyan-400", name: "Cian" },
              { code: "bg-blue-600", name: "Azul" },
              { code: "bg-purple-600", name: "Morado" },
              { code: "bg-pink-600", name: "Rosa" },
              { code: "bg-white", name: "Blanco" },
              { code: "bg-black", name: "Negro" },
            ].map((color) => (
              <button
                key={color.code}
                type="button"
                className={cn([
                  color.code,
                  "rounded-full w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center border border-black/20",
                ])}
                onClick={() => setSelected(color.code)}
                aria-label={color.name}
              >
                {selected === color.code && (
                  <IoMdCheckmark className="text-base text-white" />
                )}
              </button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ColorsSection;
