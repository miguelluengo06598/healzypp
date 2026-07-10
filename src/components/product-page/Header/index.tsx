import React from "react";
import PhotoSection from "./PhotoSection";
import { Product } from "@/types/product.types";
import { integralCF } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import Rating from "@/components/ui/Rating";
import { FaCheck } from "react-icons/fa";
// Cambio: ColorSelection y SizeSelection reemplazados por BundleSelection
import BundleSelection from "./BundleSelection";
import DeliveryTimeline from "./DeliveryTimeline";
import CheckoutActions from "./CheckoutActions";

const BENEFIT_BUBBLES = [
  "Con vinagre de manzana",
  "100% veganas",
  "Sin azúcares añadidos",
  "Favorece la digestión",
  "Apoya el bienestar",
  "Sabor delicioso",
];

const Header = ({ data }: { data: Product }) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <PhotoSection data={data} />
        </div>
        <div>
          <h1
            className={cn([
              integralCF.className,
              "text-2xl md:text-[40px] md:leading-[40px] mb-3 md:mb-3.5 capitalize",
            ])}
          >
            {data.title}
          </h1>
          <div className="flex items-center mb-3 sm:mb-3.5">
            <Rating
              initialValue={data.rating}
              allowFraction
              SVGclassName="inline-block"
              emptyClassName="fill-gray-50"
              size={25}
              readonly
            />
            <span className="text-black text-xs sm:text-sm ml-[11px] sm:ml-[13px] pb-0.5 sm:pb-0">
              {data.rating.toFixed(1)}
              <span className="text-black/60">/5</span>
            </span>
          </div>
          {/* Benefit bubbles — replace description paragraph */}
          <div className="flex flex-wrap gap-2 mb-5">
            {BENEFIT_BUBBLES.map((benefit) => (
              <span
                key={benefit}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F4EC] border border-[#487D26]/25 text-black/75 text-xs sm:text-sm font-medium px-3.5 py-1.5"
              >
                <FaCheck className="text-[#487D26] text-[10px] shrink-0" />
                {benefit}
              </span>
            ))}
          </div>
          <hr className="h-[1px] border-t-black/10 mb-5" />
          {/* Cambio: sección de bundles en lugar de color + talla */}
          <BundleSelection />
          <div className="mt-4">
            <DeliveryTimeline />
          </div>
          <div className="my-4">
            <CheckoutActions data={data} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
