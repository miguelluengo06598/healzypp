"use client";

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthModal } from "./AuthModalContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth-cookie";
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

function getErrorMessage(error: any): string {
  const msg = error?.message?.toLowerCase() || "";
  if (msg.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (msg.includes("email not confirmed")) return "Confirma tu email antes de iniciar sesión.";
  if (msg.includes("user not found")) return "No existe una cuenta con este email.";
  if (msg.includes("email address is invalid")) return "El email no es válido.";
  if (msg.includes("password")) return "La contraseña no cumple los requisitos.";
  if (msg.includes("rate limit")) return "Demasiados intentos. Espera un momento.";
  return error?.message || "Ha ocurrido un error. Inténtalo de nuevo.";
}

export default function AuthModal() {
  const { isOpen, mode, closeAuth, toggleMode } = useAuthModal();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [isForgot, setIsForgot] = useState(false);

  // Limpiar estado al cambiar de modo o cerrar
  useEffect(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError("");
    setSuccessMsg("");
    setResetSent(false);
    setIsForgot(false);
    setShowPassword(false);
  }, [mode, isOpen]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");
      setLoading(true);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(getErrorMessage(error));
          return;
        }

        setSessionCookie();
        closeAuth();
      } catch (err) {
        setError("No se pudo conectar con el servidor. Revisa tu conexión.");
        console.error("Supabase signIn error:", err);
      } finally {
        setLoading(false);
      }
    },
    [email, password, closeAuth]
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");

      if (!email || !password || !name) {
        setError("Completa todos los campos.");
        return;
      }

      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }

      setLoading(true);

      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });

        if (error) {
          setError(getErrorMessage(error));
          return;
        }

        setSuccessMsg("Revisa tu correo para confirmar tu cuenta.");
      } catch (err) {
        setError("No se pudo conectar con el servidor. Revisa tu conexión.");
        console.error("Supabase signUp error:", err);
      } finally {
        setLoading(false);
      }
    },
    [email, password, confirmPassword, name]
  );

  const handleGoogle = useCallback(async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) setError(getErrorMessage(error));
    } catch (err) {
      setError("No se pudo conectar con el servidor. Revisa tu conexión.");
      console.error("Supabase OAuth error:", err);
    }
  }, []);

  const handleReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");
      if (!email) {
        setError("Introduce tu email.");
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/account/profile` : undefined,
        });
        if (error) {
          setError(getErrorMessage(error));
          return;
        }
        setResetSent(true);
        setSuccessMsg("Te hemos enviado un email para restablecer tu contraseña.");
      } catch (err) {
        setError("No se pudo conectar con el servidor. Revisa tu conexión.");
        console.error("Supabase resetPassword error:", err);
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeAuth()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" showClose>
        <div className="p-6 sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-semibold text-center">
              {isForgot
                ? "Recuperar contraseña"
                : mode === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {isForgot
                ? "Introduce tu email y te enviaremos un enlace."
                : mode === "login"
                ? `Accede a tu cuenta de ${SITE_NAME}`
                : `Únete a ${SITE_NAME} hoy`}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          {isForgot ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email"
                  className={`${inputClass} pl-10`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl h-11"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Enviar enlace"
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setError("");
                  setSuccessMsg("");
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-black transition"
              >
                Volver al inicio de sesión
              </button>
            </form>
          ) : mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email"
                  className={`${inputClass} pl-10`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  className={`${inputClass} pl-10 pr-10`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(true);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs text-gray-500 hover:text-black transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl h-11"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">o</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl h-11"
                onClick={handleGoogle}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar con Google
              </Button>

              <p className="text-center text-sm text-gray-500">
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-medium text-black hover:underline"
                >
                  Regístrate
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nombre completo"
                  className={`${inputClass} pl-10`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email"
                  className={`${inputClass} pl-10`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña (mín. 8 caracteres)"
                  className={`${inputClass} pl-10 pr-10`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  className={`${inputClass} pl-10 pr-10`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl h-11"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Crear cuenta"
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">o</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl h-11"
                onClick={handleGoogle}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar con Google
              </Button>

              <p className="text-center text-sm text-gray-500">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-medium text-black hover:underline"
                >
                  Inicia sesión
                </button>
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
