"use client";

import React from "react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

/**
 * Banner minimalista de consentimiento de cookies.
 * Cumple con GDPR/LOPD al solicitar consentimiento explícito antes de
 * cualquier tracking no esencial.
 */
export default function CookieBanner() {
  const { consent, accept, decline } = useCookieConsent();

  if (consent !== "pending") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 p-4 z-[100] shadow-lg">
      <div className="max-w-frame mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-black/70">
          <p>
            Utilizamos{" "}
            <strong className="text-black">cookies técnicas</strong> necesarias
            para el funcionamiento de la tienda y, con tu consentimiento,{" "}
            <strong className="text-black">cookies de análisis</strong> para
            mejorar tu experiencia.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={accept}
            className="bg-[#487D26] hover:bg-[#3a6620] transition-colors text-white px-5 py-2.5 rounded-full text-sm font-medium"
          >
            Aceptar todas
          </button>
          <button
            onClick={decline}
            className="border border-black/20 hover:border-black/40 transition-colors text-black/70 px-5 py-2.5 rounded-full text-sm font-medium"
          >
            Solo esenciales
          </button>
        </div>
      </div>
    </div>
  );
}
