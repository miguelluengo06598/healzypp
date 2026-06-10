"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import { FaCheckCircle } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";
import { submitContactAction } from "@/app/actions/contact";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormValues = {
  name: string;
  email: string;
  message: string;
};

// ─── Helpers — same pattern as checkout pages ─────────────────────────────────

function InputWrapper({
  label,
  error,
  success,
  children,
}: {
  label: string;
  error?: string;
  success?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-black/70">{label}</label>
      <div className="relative">
        {children}
        {success && !error && (
          <FaCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-[#487D26] text-sm pointer-events-none" />
        )}
        {error && (
          <FaCircleXmark className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400 text-sm pointer-events-none" />
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (error?: string, success?: boolean) =>
  cn(
    "w-full rounded-full px-5 py-3 border text-sm outline-none transition-all pr-10",
    error
      ? "border-red-400 focus:ring-1 focus:ring-red-400/30"
      : success
      ? "border-[#487D26] focus:ring-1 focus:ring-[#487D26]/30"
      : "border-black/20 focus:border-[#487D26] focus:ring-1 focus:ring-[#487D26]/30"
  );

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm<FormValues>({ mode: "onTouched" });

  const watched = watch();

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitContactAction(data);
      if (!result.success) {
        setSubmitError(result.error ?? "Error desconocido.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Error inesperado. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <FaCheckCircle className="text-[#487D26] text-6xl mb-6" />
        <h1 className={cn(integralCF.className, "text-3xl md:text-4xl mb-4")}>
          ¡Mensaje enviado!
        </h1>
        <p className="text-black/60 max-w-md">
          Hemos recibido tu mensaje. Te responderemos lo antes posible.
        </p>
      </main>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <main className="pb-20">
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />

        <h1
          className={cn(
            integralCF.className,
            "text-2xl md:text-[40px] md:leading-[44px] mb-2"
          )}
        >
          Contacto
        </h1>
        <p className="text-black/60 text-sm md:text-base mb-8 max-w-[560px]">
          ¿Tienes alguna pregunta sobre nuestros productos? Escríbenos y te
          responderemos lo antes posible.
        </p>

        <div className="max-w-[560px]">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-4"
          >
            {/* Nombre */}
            <InputWrapper
              label="Nombre *"
              error={errors.name?.message}
              success={
                touchedFields.name && !errors.name && !!watched.name
              }
            >
              <input
                type="text"
                autoComplete="name"
                placeholder="Tu nombre completo"
                className={inputCls(
                  errors.name?.message,
                  touchedFields.name && !errors.name && !!watched.name
                )}
                {...register("name", {
                  required: "El nombre es obligatorio",
                  minLength: { value: 2, message: "Mínimo 2 caracteres" },
                })}
              />
            </InputWrapper>

            {/* Email */}
            <InputWrapper
              label="Email *"
              error={errors.email?.message}
              success={
                touchedFields.email && !errors.email && !!watched.email
              }
            >
              <input
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className={inputCls(
                  errors.email?.message,
                  touchedFields.email && !errors.email && !!watched.email
                )}
                {...register("email", {
                  required: "El email es obligatorio",
                  pattern: {
                    value: EMAIL_RE,
                    message: "Introduce un email válido",
                  },
                })}
              />
            </InputWrapper>

            {/* Mensaje */}
            <InputWrapper
              label="Mensaje *"
              error={errors.message?.message}
              success={
                touchedFields.message &&
                !errors.message &&
                !!watched.message
              }
            >
              <textarea
                rows={5}
                placeholder="¿En qué podemos ayudarte?"
                className={cn(
                  inputCls(
                    errors.message?.message,
                    touchedFields.message &&
                      !errors.message &&
                      !!watched.message
                  ),
                  // Override the rounded-full from inputCls for textarea
                  "rounded-[20px] resize-none"
                )}
                {...register("message", {
                  required: "El mensaje es obligatorio",
                  minLength: {
                    value: 10,
                    message: "Mínimo 10 caracteres",
                  },
                })}
              />
            </InputWrapper>

            {/* Server error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-[16px] p-4 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full rounded-full h-[52px] text-base font-bold text-white transition-all",
                submitting
                  ? "bg-[#487D26]/60 cursor-not-allowed"
                  : "bg-[#487D26] hover:bg-[#3a6620]"
              )}
            >
              {submitting ? "Enviando..." : "Enviar mensaje"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
