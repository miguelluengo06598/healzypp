import React from "react";

export type SpecItem = {
  label: string;
  value: string;
};

const specsData: SpecItem[] = [
  {
    label: "Composición",
    value: "Vinagre de manzana orgánico, pectina de manzana, eritritol, stevia",
  },
  {
    label: "Modo de uso",
    value: "2 gominolas al día, preferiblemente antes del desayuno",
  },
  {
    label: "Formato",
    value: "60 gominolas por bote (30 días de suministro)",
  },
  {
    label: "Certificaciones",
    value: "Orgánico, Vegano, Sin gluten",
  },
];

const ProductDetails = () => {
  return (
    <>
      {specsData.map((item, i) => (
        <div className="grid grid-cols-3" key={i}>
          <div>
            <p className="text-sm py-3 w-full leading-7 lg:py-4 pr-2 text-neutral-500">
              {item.label}
            </p>
          </div>
          <div className="col-span-2 py-3 lg:py-4 border-b">
            <p className="text-sm w-full leading-7 text-neutral-800 font-medium">
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </>
  );
};

export default ProductDetails;
