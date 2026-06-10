// ─────────────────────────────────────────────────────────────────────────────
// Hook de gestión de consentimiento de cookies (GDPR / LOPD)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

const CONSENT_KEY = "healzyp_cookie_consent";

type ConsentState = "granted" | "denied" | "pending";

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState>("pending");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "granted") setConsent("granted");
      else if (stored === "denied") setConsent("denied");
      else setConsent("pending");
    } catch {
      // localStorage no disponible (modo privado, etc.)
      setConsent("denied");
    }
  }, []);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, "granted");
      setConsent("granted");
      // Recargar para activar tracking con consentimiento
      window.location.reload();
    } catch {
      // noop
    }
  }, []);

  const decline = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, "denied");
      setConsent("denied");
    } catch {
      // noop
    }
  }, []);

  return { consent, accept, decline };
}
