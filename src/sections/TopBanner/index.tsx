"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useEffect, useState } from "react";

const OFFER_DURATION_MS = 10 * 60 * 1000;

const TopBanner = () => {
  const [visible, setVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(OFFER_DURATION_MS);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("offer_timer_end");
    let endTime = stored ? parseInt(stored, 10) : Date.now() + OFFER_DURATION_MS;

    if (!stored || isNaN(endTime)) {
      endTime = Date.now() + OFFER_DURATION_MS;
      sessionStorage.setItem("offer_timer_end", endTime.toString());
    }

    const update = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        setEnded(true);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="bg-[#487D26] text-white text-center py-2 px-2 sm:px-4 xl:px-0">
      <div className="relative max-w-frame mx-auto">
        <p className="text-xs sm:text-sm flex items-center justify-center gap-1.5 flex-wrap">
          {ended ? (
            <>
              ⚡ ¡Última oportunidad! Precios especiales por tiempo limitado
            </>
          ) : (
            <>
              ⚡ ¡Oferta especial! Precios reducidos solo durante:{" "}
              <span className="inline-block bg-yellow-300 text-green-900 font-bold rounded px-2 py-0.5 text-xs sm:text-sm">
                {display}
              </span>{" "}
              ¡Aprovéchalo ahora!
            </>
          )}
        </p>
        <Button
          variant="ghost"
          className="hover:bg-transparent absolute right-0 top-1/2 -translate-y-1/2 w-fit h-fit p-1 hidden sm:flex"
          size="icon"
          type="button"
          aria-label="cerrar banner"
          onClick={() => setVisible(false)}
        >
          <Image
            priority
            src="/icons/times.svg"
            height={13}
            width={13}
            alt="close banner"
          />
        </Button>
      </div>
    </div>
  );
};

export default TopBanner;
