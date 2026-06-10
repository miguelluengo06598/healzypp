"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type AuthMode = "login" | "register";

interface AuthModalContextValue {
  isOpen: boolean;
  mode: AuthMode;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  toggleMode: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  const openAuth = useCallback((m: AuthMode = "login") => {
    setMode(m);
    setIsOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
  }, []);

  return (
    <AuthModalContext.Provider
      value={{ isOpen, mode, openAuth, closeAuth, toggleMode }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}
