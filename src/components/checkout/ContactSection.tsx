"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import type { CheckoutContact } from "@/hooks/useCheckout"
import { FaCheckCircle } from "react-icons/fa"
import { FaCircleXmark } from "react-icons/fa6"

interface ContactSectionProps {
  defaultValues?: CheckoutContact | null
  onComplete: (data: CheckoutContact) => void
  isCompleted: boolean
  onEdit: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputCls = (error?: string, success?: boolean) =>
  cn(
    "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all",
    error
      ? "border-red-400 focus:ring-1 focus:ring-red-400/30"
      : success
      ? "border-[#487D26] focus:ring-1 focus:ring-[#487D26]/20"
      : "border-[#E5E5E5] focus:border-[#487D26] focus:ring-1 focus:ring-[#487D26]/20"
  )

function Field({
  label,
  error,
  success,
  children,
}: {
  label: string
  error?: string
  success?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-black/60 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        {children}
        {success && !error && (
          <FaCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-[#487D26] text-sm pointer-events-none" />
        )}
        {error && (
          <FaCircleXmark className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-sm pointer-events-none" />
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function ContactSection({
  defaultValues,
  onComplete,
  isCompleted,
  onEdit,
}: ContactSectionProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm<CheckoutContact>({
    mode: "onTouched",
    defaultValues: defaultValues ?? { email: "", firstName: "", lastName: "", saveInfo: false },
  })

  const watched = watch()

  // Pre-fill from Supabase auth if logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      if (user.email && !watched.email) setValue("email", user.email)
      const meta = user.user_metadata as Record<string, string> | undefined
      if (meta?.full_name) {
        const parts = meta.full_name.split(" ")
        if (parts[0] && !watched.firstName) setValue("firstName", parts[0])
        if (parts.slice(1).join(" ") && !watched.lastName)
          setValue("lastName", parts.slice(1).join(" "))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isCompleted && defaultValues) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-1">
              Contacto
            </p>
            <p className="text-sm font-medium">{defaultValues.email}</p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-[#487D26] hover:underline font-medium"
          >
            Editar
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-[#E5E5E5] p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
          1
        </div>
        <h2 className="font-semibold text-base">Información de contacto</h2>
      </div>

      <form onSubmit={handleSubmit(onComplete)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Nombre"
            error={errors.firstName?.message}
            success={!!touchedFields.firstName && !errors.firstName && !!watched.firstName}
          >
            <input
              type="text"
              autoComplete="given-name"
              placeholder="María"
              className={inputCls(
                errors.firstName?.message,
                !!touchedFields.firstName && !errors.firstName && !!watched.firstName
              )}
              {...register("firstName", {
                required: "El nombre es obligatorio",
                minLength: { value: 2, message: "Mínimo 2 caracteres" },
              })}
            />
          </Field>

          <Field
            label="Apellidos"
            error={errors.lastName?.message}
            success={!!touchedFields.lastName && !errors.lastName && !!watched.lastName}
          >
            <input
              type="text"
              autoComplete="family-name"
              placeholder="García López"
              className={inputCls(
                errors.lastName?.message,
                !!touchedFields.lastName && !errors.lastName && !!watched.lastName
              )}
              {...register("lastName", {
                required: "Los apellidos son obligatorios",
                minLength: { value: 2, message: "Mínimo 2 caracteres" },
              })}
            />
          </Field>
        </div>

        <Field
          label="Correo electrónico"
          error={errors.email?.message}
          success={!!touchedFields.email && !errors.email && !!watched.email}
        >
          <input
            type="email"
            autoComplete="email"
            placeholder="maria@ejemplo.com"
            className={inputCls(
              errors.email?.message,
              !!touchedFields.email && !errors.email && !!watched.email
            )}
            {...register("email", {
              required: "El email es obligatorio",
              pattern: { value: EMAIL_RE, message: "Email no válido" },
            })}
          />
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-[#E5E5E5] accent-[#487D26]"
            {...register("saveInfo")}
          />
          <span className="text-sm text-black/60">
            Guardar información para la próxima vez
          </span>
        </label>

        <button
          type="submit"
          className="w-full sm:w-auto sm:self-end rounded-xl bg-[#487D26] hover:bg-[#3a6620] text-white font-semibold px-8 py-3 text-sm transition-colors"
        >
          Continuar con la dirección →
        </button>
      </form>
    </section>
  )
}
