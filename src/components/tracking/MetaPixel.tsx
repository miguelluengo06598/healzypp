// ─────────────────────────────────────────────────────────────────────────────
// MetaPixel — Carga condicional del Pixel de Meta (Facebook/Instagram)
// Solo se carga si el usuario ha dado consentimiento de cookies/analytics.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import React from 'react'
import Script from 'next/script'
import { useCookieConsent } from '@/hooks/useCookieConsent'

// Tipado global de fbq
declare global {
  interface Window {
    fbq: (
      command: 'init' | 'track' | 'trackCustom',
      eventName: string,
      parameters?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void
    _fbq?: unknown
  }
}

/**
 * Inyecta el script del Pixel de Meta de forma lazy y condicional.
 * No renderiza nada si no hay consentimiento.
 */
export default function MetaPixel() {
  const { consent } = useCookieConsent()
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

  if (!pixelId || consent !== 'granted') {
    return null
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
