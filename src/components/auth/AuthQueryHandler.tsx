"use client";

import { useEffect } from "react";
import { useAuthModal } from "./AuthModalContext";

export default function AuthQueryHandler() {
  const { openAuth } = useAuthModal();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "required") {
      openAuth("login");
      // Limpiar query param sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      window.history.replaceState({}, "", url.toString());
    }
  }, [openAuth]);

  return null;
}
