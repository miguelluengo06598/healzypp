"use client";

import { Product } from "@/types/product.types";
import Image from "next/image";
import React, { useState } from "react";

const PhotoSection = ({ data }: { data: Product }) => {
  // -1 = imagen de portada (data.srcUrl), no necesariamente presente en data.gallery
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const selected =
    selectedIndex === -1 ? data.srcUrl : data.gallery?.[selectedIndex] ?? data.srcUrl;
  const selectedAlt =
    selectedIndex === -1
      ? data.title
      : `${data.title} — foto ${selectedIndex + 1}`;

  // Miniaturas debajo de la imagen hasta xl; tira lateral solo en xl+, donde
  // las 4 miniaturas (106px + gaps) caben alineadas con la imagen (530px).
  return (
    <div className="flex flex-col-reverse xl:flex-row xl:space-x-3.5">
      {data?.gallery && data.gallery.length > 0 && (
        <div className="flex xl:flex-col space-x-3 xl:space-x-0 xl:space-y-3.5 w-full xl:w-fit items-center xl:justify-start justify-center">
          {data.gallery.map((photo, index) => (
            <button
              key={index}
              type="button"
              className="bg-[#F0EEED] rounded-[13px] xl:rounded-[20px] w-full max-w-[111px] max-h-[106px] aspect-square overflow-hidden"
              onClick={() => setSelectedIndex(index)}
            >
              <Image
                src={photo}
                width={111}
                height={106}
                className="rounded-md w-full h-full object-cover hover:scale-110 transition-all duration-500"
                alt={`${data.title} — foto ${index + 1}`}
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center bg-[#F0EEED] rounded-[13px] sm:rounded-[20px] w-full sm:w-96 md:w-full mx-auto h-full max-h-[530px] min-h-[330px] lg:min-h-[380px] xl:min-h-[530px] overflow-hidden mb-3 xl:mb-0">
        <Image
          src={selected}
          width={444}
          height={530}
          className="rounded-md w-full h-full object-cover hover:scale-110 transition-all duration-500"
          alt={selectedAlt}
          priority
        />
      </div>
    </div>
  );
};

export default PhotoSection;
