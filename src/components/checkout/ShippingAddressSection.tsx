"use client"

import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { cn } from "@/lib/utils"
import type { ShippingAddress } from "@/hooks/useCheckout"
import { FaCheckCircle } from "react-icons/fa"
import { FaCircleXmark } from "react-icons/fa6"

const SPAIN_PROVINCES = [
  "Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona",
  "Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ciudad Real","Córdoba","Cuenca",
  "Gerona","Granada","Guadalajara","Guipúzcoa","Huelva","Huesca","Islas Baleares","Jaén",
  "La Coruña","La Rioja","Las Palmas","León","Lérida","Lugo","Madrid","Málaga","Murcia",
  "Navarra","Orense","Palencia","Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia",
  "Sevilla","Soria","Tarragona","Teruel","Toledo","Valencia","Valladolid","Vizcaya",
  "Zamora","Zaragoza",
]

interface ShippingAddressSectionProps {
  defaultValues?: ShippingAddress | null
  onComplete: (data: ShippingAddress) => void
  isCompleted: boolean
  onEdit: () => void
}

const inputCls = (error?: string, success?: boolean) =>
  cn(
    "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all bg-white",
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
  optional,
  children,
}: {
  label: string
  error?: string
  success?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-black/60 uppercase tracking-wide">
        {label}
        {optional && <span className="ml-1 normal-case text-black/30">(opcional)</span>}
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

export default function ShippingAddressSection({
  defaultValues,
  onComplete,
  isCompleted,
  onEdit,
}: ShippingAddressSectionProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm<ShippingAddress>({
    mode: "onTouched",
    defaultValues: defaultValues ?? {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      apartment: "",
      postalCode: "",
      city: "",
      province: "",
      country: "España",
    },
  })

  const watched = watch()

  // Mapbox AddressAutofill — dynamic import to avoid SSR errors
  const [AddressAutofill, setAddressAutofill] = useState<React.ComponentType<any> | null>(null)
  useEffect(() => {
    import("@mapbox/search-js-react").then((mod) => {
      setAddressAutofill(() => mod.AddressAutofill)
    })
  }, [])

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

  const onRetrieve = (res: any) => {
    const f = res.features?.[0]?.properties
    if (!f) return
    if (f.address_line1) setValue("address", f.address_line1, { shouldValidate: true })
    if (f.place) setValue("city", f.place, { shouldValidate: true })
    if (f.postcode) setValue("postalCode", f.postcode, { shouldValidate: true })
    if (f.region) setValue("province", f.region, { shouldValidate: true })
  }

  const suc = (field: keyof ShippingAddress) =>
    !!touchedFields[field] && !errors[field] && !!watched[field]

  if (isCompleted && defaultValues) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-black/40 uppercase tracking-wide mb-1">
              Dirección de envío
            </p>
            <p className="text-sm font-medium">
              {defaultValues.firstName} {defaultValues.lastName}
            </p>
            <p className="text-sm text-black/60">
              {defaultValues.address}
              {defaultValues.apartment ? `, ${defaultValues.apartment}` : ""},{" "}
              {defaultValues.postalCode} {defaultValues.city}, {defaultValues.province}
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-[#487D26] hover:underline font-medium ml-4"
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
          2
        </div>
        <h2 className="font-semibold text-base">Dirección de envío</h2>
      </div>

      <form onSubmit={handleSubmit(onComplete)} className="flex flex-col gap-4">
        {/* Mapbox address search */}
        {AddressAutofill && mapboxToken && (
          <div>
            <p className="text-xs font-medium text-black/60 uppercase tracking-wide mb-1.5">
              Busca tu dirección
            </p>
            <AddressAutofill
              accessToken={mapboxToken}
              options={{ country: "es", language: "es" }}
              onRetrieve={onRetrieve}
            >
              <input
                type="text"
                autoComplete="address-line1"
                placeholder="Escribe tu calle para autocompletar…"
                className={cn(
                  "w-full rounded-xl border border-[#E5E5E5] px-4 py-3 text-sm outline-none",
                  "focus:border-[#487D26] focus:ring-1 focus:ring-[#487D26]/20 transition-all"
                )}
              />
            </AddressAutofill>
            <p className="text-xs text-black/30 mt-1">
              Selecciona una sugerencia para rellenar los campos automáticamente
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre" error={errors.firstName?.message} success={suc("firstName")}>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="María"
              className={inputCls(errors.firstName?.message, suc("firstName"))}
              {...register("firstName", { required: "Obligatorio", minLength: { value: 2, message: "Mínimo 2 caracteres" } })}
            />
          </Field>

          <Field label="Apellidos" error={errors.lastName?.message} success={suc("lastName")}>
            <input
              type="text"
              autoComplete="family-name"
              placeholder="García López"
              className={inputCls(errors.lastName?.message, suc("lastName"))}
              {...register("lastName", { required: "Obligatorio", minLength: { value: 2, message: "Mínimo 2 caracteres" } })}
            />
          </Field>
        </div>

        <Field label="Teléfono" error={errors.phone?.message} success={suc("phone")}>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="612 345 678"
            className={inputCls(errors.phone?.message, suc("phone"))}
            {...register("phone", {
              required: "El teléfono es obligatorio",
              validate: (v) =>
                /^(\+34|0034|34)?[6789]\d{8}$/.test(v.replace(/[\s\-]/g, "")) ||
                "Teléfono español no válido (ej: 612 345 678)",
            })}
          />
        </Field>

        <Field label="Dirección (calle y número)" error={errors.address?.message} success={suc("address")}>
          <input
            type="text"
            autoComplete="address-line1"
            placeholder="Calle Mayor, 12"
            className={inputCls(errors.address?.message, suc("address"))}
            {...register("address", {
              required: "La dirección es obligatoria",
              minLength: { value: 5, message: "Dirección demasiado corta" },
            })}
          />
        </Field>

        <Field label="Piso / Puerta" optional error={errors.apartment?.message}>
          <input
            type="text"
            autoComplete="address-line2"
            placeholder="3º B"
            className={inputCls(errors.apartment?.message)}
            {...register("apartment")}
          />
        </Field>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="C. Postal" error={errors.postalCode?.message} success={suc("postalCode")}>
            <input
              type="text"
              autoComplete="postal-code"
              placeholder="28001"
              maxLength={5}
              className={inputCls(errors.postalCode?.message, suc("postalCode"))}
              {...register("postalCode", {
                required: "Obligatorio",
                pattern: { value: /^\d{5}$/, message: "5 dígitos" },
              })}
            />
          </Field>

          <Field label="Ciudad" error={errors.city?.message} success={suc("city")}>
            <input
              type="text"
              autoComplete="address-level2"
              placeholder="Madrid"
              className={inputCls(errors.city?.message, suc("city"))}
              {...register("city", { required: "Obligatorio" })}
            />
          </Field>

          <Field label="Provincia" error={errors.province?.message} success={suc("province")}>
            <select
              className={cn(
                inputCls(errors.province?.message, suc("province")),
                "appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23666%22 d=%22m7 10 5 5 5-5z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right"
              )}
              {...register("province", { required: "Obligatorio" })}
            >
              <option value="">Elige...</option>
              {SPAIN_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="País" error={errors.country?.message} success={suc("country")}>
          <select
            className={cn(
              inputCls(errors.country?.message, suc("country")),
              "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23666%22 d=%22m7 10 5 5 5-5z%22/%3E%3C/svg%3E')] bg-no-repeat bg-right"
            )}
            {...register("country")}
          >
            <option value="España">España</option>
            <option value="Portugal">Portugal</option>
            <option value="Francia">Francia</option>
            <option value="Alemania">Alemania</option>
            <option value="Italia">Italia</option>
          </select>
        </Field>

        <button
          type="submit"
          className="w-full sm:w-auto sm:self-end rounded-xl bg-[#487D26] hover:bg-[#3a6620] text-white font-semibold px-8 py-3 text-sm transition-colors"
        >
          Continuar con el envío →
        </button>
      </form>
    </section>
  )
}
