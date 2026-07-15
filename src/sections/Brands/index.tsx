import React from "react";

const trustLabels: string[] = [
  "100% NATURAL",
  "SIN AZÚCARES AÑADIDOS",
  "APTO PARA VEGANOS",
  "FÁCIL DE TOMAR",
  "CALIDAD PREMIUM",
  "BIENESTAR DIARIO",
];

// Duplicated so the second copy fills the screen when the first exits left,
// creating a seamless infinite loop via translateX(0 → -50%).
const tickerItems = [...trustLabels, ...trustLabels];

const Brands = () => {
  return (
    <div className="bg-[#487D26] overflow-hidden">
      {/* Keyframes are scoped to this component and don't affect anything else */}
      <style>{`
        @keyframes healzyp-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .healzyp-ticker-track {
          animation: healzyp-ticker 28s linear infinite;
          will-change: transform;
        }
        .healzyp-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="healzyp-ticker-track flex w-max items-center">
        {tickerItems.map((label, idx) => (
          <span
            key={idx}
            className="text-white font-bold text-xs lg:text-sm tracking-widest text-nowrap my-5 md:my-11 px-8 lg:px-12"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Brands;
