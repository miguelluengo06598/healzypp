"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import OrderSummary, {
  Bundle,
  getStoredBundle,
} from "@/components/checkout/OrderSummary";
import SecurityBadges from "@/components/checkout/SecurityBadges";
import { createOrderAction } from "@/app/actions/orders";
import Link from "next/link";
import { FaCheckCircle } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";
import OrderTimeline from "@/components/orders/OrderTimeline";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  province: string;
  // honeypot
  _hp: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHONE_RE = /^(\+34|0034|34)?[6789]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CodCheckoutPage() {
  const router = useRouter();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setBundle(getStoredBundle());
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm<FormValues>({ mode: "onTouched" });

  const watched = watch();

  // Mapbox AddressAutofill — loaded dynamically to avoid SSR issues
  const [AddressAutofill, setAddressAutofill] =
    useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("@mapbox/search-js-react").then((mod) => {
      setAddressAutofill(() => mod.AddressAutofill);
    });
  }, []);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  const onSubmit = async (data: FormValues) => {
    if (data._hp) return; // honeypot
    if (!bundle) return;

    setSubmitting(true);
    setOrderError(null);

    try {
      const result = await createOrderAction({
        customerData: {
          fullName:   data.fullName,
          phone:      data.phone.replace(/[\s\-]/g, ""),
          email:      data.email || undefined,
          address:    data.address,
          postalCode: data.postcode,
          city:       data.city,
          province:   data.province,
        },
        bundleId:           bundle.id,
        bundlePriceInCents: bundle.priceInCents,
        paymentMethod: 'COD',
      });

      if (!result.success) {
        console.error('[COD checkout] createOrderAction error:', result.error);
        setOrderError(result.error ?? 'Error desconocido al crear el pedido.');
        setSubmitting(false);
        return;
      }

      // Guardar en sessionStorage y redirigir a confirmación
      try {
        sessionStorage.setItem('healzyp_order', JSON.stringify({
          orderNumber: result.orderNumber ?? 'cod-unknown',
          email: data.email || '',
          firstName: data.fullName.split(' ')[0],
          paymentMethod: 'cod',
          items: [{ name: bundle.name, srcUrl: '/icons/favericonweb.png', quantity: 1, attributes: [], price: bundle.priceInCents / 100, discount: 0 }],
          shippingAddress: { firstName: data.fullName.split(' ')[0], lastName: data.fullName.split(' ').slice(1).join(' '), address: data.address, apartment: '', postalCode: data.postcode, city: data.city, province: data.province, country: 'España' },
          shippingMethod: { name: 'Envío gratuito', estimatedDays: '2-4 días laborables', price: 0 },
          subtotalEur: bundle.priceInCents / 100,
          shippingCostEur: 0,
          couponDiscountEur: 0,
          totalEur: bundle.priceInCents / 100,
        }));
      } catch {}
      router.push('/order/confirmation');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[COD checkout] excepción inesperada:', msg);
      setOrderError(`Error inesperado: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#F7F8F5]">
        <div className="max-w-frame mx-auto px-4 xl:px-0 py-10 md:py-16">
          {/* Success header */}
          <div className="text-center mb-8 md:mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <FaCheckCircle className="text-[#487D26] text-6xl mb-5 mx-auto" />
            </motion.div>
            <h1 className={cn(integralCF.className, "text-3xl md:text-4xl mb-3")}>
              ¡Pedido confirmado!
            </h1>
            <p className="text-black/60 max-w-md mx-auto">
              Hemos recibido tu pedido. Te contactaremos por teléfono para confirmar
              la entrega. El pago se realizará al recibir el paquete.
            </p>
          </div>

          {/* Order timeline */}
          <div className="max-w-2xl mx-auto">
            <OrderTimeline orderConfirmedAt={new Date()} />
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <button
              onClick={() => router.push("/")}
              className="bg-[#487D26] hover:bg-[#3a6620] transition-all text-white rounded-full px-8 py-3 font-medium"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black/10 px-4 py-4">
        <div className="max-w-frame mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-black/50 hover:text-black transition-colors"
          >
            ← Volver
          </button>
          <h1 className={cn(integralCF.className, "text-xl md:text-2xl")}>
            HEALZYP
          </h1>
          <SecurityBadges className="hidden sm:flex" />
        </div>
      </header>

      <div className="max-w-frame mx-auto px-4 xl:px-0 py-8 md:py-12">
        <h2
          className={cn(
            integralCF.className,
            "text-[28px] md:text-[36px] mb-2"
          )}
        >
          Pago Contra Reembolso
        </h2>
        <p className="text-black/60 text-sm mb-8">
          Pagas cuando recibas el pedido en la puerta de tu casa. Sin riesgos.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
          {/* Mobile: order summary at top */}
          <div className="lg:hidden">
            {bundle && <OrderSummary bundle={bundle} />}
          </div>

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {/* Honeypot — invisible to real users */}
            <input
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute opacity-0 pointer-events-none h-0 w-0"
              {...register("_hp")}
            />

            {/* city + province — auto-rellenados por Mapbox; visibles como fallback */}
            <input type="hidden" {...register("city")} />
            <input type="hidden" {...register("province")} />
            {/* Los campos visibles de ciudad y provincia se muestran si Mapbox no está disponible */}

            {/* Nombre completo */}
            <InputWrapper
              label="Nombre completo *"
              error={errors.fullName?.message}
              success={
                touchedFields.fullName && !errors.fullName && !!watched.fullName
              }
            >
              <input
                type="text"
                autoComplete="name"
                placeholder="María García López"
                className={inputCls(
                  errors.fullName?.message,
                  touchedFields.fullName && !errors.fullName && !!watched.fullName
                )}
                {...register("fullName", {
                  required: "El nombre es obligatorio",
                  minLength: { value: 3, message: "Mínimo 3 caracteres" },
                })}
              />
            </InputWrapper>

            {/* Email */}
            <InputWrapper
              label="Correo electrónico"
              error={errors.email?.message}
              success={touchedFields.email && !errors.email && !!watched.email}
            >
              <input
                type="email"
                autoComplete="email"
                placeholder="maria@ejemplo.com"
                className={inputCls(
                  errors.email?.message,
                  touchedFields.email && !errors.email && !!watched.email
                )}
                {...register("email", {
                  pattern: { value: EMAIL_RE, message: "Email no válido" },
                })}
              />
            </InputWrapper>

            {/* Teléfono */}
            <InputWrapper
              label="Teléfono *"
              error={errors.phone?.message}
              success={touchedFields.phone && !errors.phone && !!watched.phone}
            >
              <input
                type="tel"
                autoComplete="tel"
                placeholder="612 345 678"
                className={inputCls(
                  errors.phone?.message,
                  touchedFields.phone && !errors.phone && !!watched.phone
                )}
                {...register("phone", {
                  required: "El teléfono es obligatorio",
                  validate: (v) =>
                    PHONE_RE.test(v.replace(/[\s\-]/g, "")) ||
                    "Introduce un teléfono español válido",
                })}
              />
            </InputWrapper>

            {/* Dirección — con autocompletado Mapbox */}
            <InputWrapper
              label="Dirección *"
              error={errors.address?.message}
              success={
                touchedFields.address && !errors.address && !!watched.address
              }
            >
              {AddressAutofill && mapboxToken ? (
                <AddressAutofill
                  accessToken={mapboxToken}
                  options={{ country: "es", language: "es" }}
                  popoverOptions={{
                    placement: "bottom-start",
                    flip: true,
                    offset: 5,
                  }}
                  theme={{
                    cssText: `
                      .Results {
                        z-index: 99999 !important;
                        position: fixed !important;
                      }
                    `,
                  }}
                  onRetrieve={(res: any) => {
                    const f = res.features?.[0]?.properties;
                    if (!f) return;
                    if (f.address_line1)
                      setValue("address", f.address_line1, {
                        shouldValidate: true,
                      });
                    if (f.postcode)
                      setValue("postcode", f.postcode, {
                        shouldValidate: true,
                      });
                    // City + province saved hidden — available in onSubmit
                    if (f.place) setValue("city", f.place);
                    if (f.region) setValue("province", f.region);
                  }}
                >
                  <input
                    type="text"
                    autoComplete="address-line1"
                    placeholder="Calle Mayor 12, 3º B"
                    className={inputCls(
                      errors.address?.message,
                      touchedFields.address && !errors.address && !!watched.address
                    )}
                    {...register("address", {
                      required: "La dirección es obligatoria",
                      minLength: { value: 5, message: "Dirección muy corta" },
                    })}
                  />
                </AddressAutofill>
              ) : (
                <input
                  type="text"
                  autoComplete="address-line1"
                  placeholder="Calle Mayor 12, 3º B"
                  className={inputCls(
                    errors.address?.message,
                    touchedFields.address && !errors.address && !!watched.address
                  )}
                  {...register("address", {
                    required: "La dirección es obligatoria",
                    minLength: { value: 5, message: "Dirección muy corta" },
                  })}
                />
              )}
            </InputWrapper>

            {/* Código postal */}
            <InputWrapper
              label="Código postal *"
              error={errors.postcode?.message}
              success={
                touchedFields.postcode && !errors.postcode && !!watched.postcode
              }
            >
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="28001"
                maxLength={5}
                className={inputCls(
                  errors.postcode?.message,
                  touchedFields.postcode && !errors.postcode && !!watched.postcode
                )}
                {...register("postcode", {
                  required: "El código postal es obligatorio",
                  pattern: {
                    value: /^\d{5}$/,
                    message: "Debe tener 5 dígitos",
                  },
                })}
              />
            </InputWrapper>

            {/* Ciudad */}
            <InputWrapper
              label="Ciudad *"
              error={errors.city?.message}
              success={touchedFields.city && !errors.city && !!watched.city}
            >
              <input
                type="text"
                autoComplete="address-level2"
                placeholder="Madrid"
                className={inputCls(
                  errors.city?.message,
                  touchedFields.city && !errors.city && !!watched.city
                )}
                {...register("city", {
                  required: "La ciudad es obligatoria",
                  minLength: { value: 2, message: "Mínimo 2 caracteres" },
                })}
              />
            </InputWrapper>

            {/* Provincia */}
            <InputWrapper
              label="Provincia *"
              error={errors.province?.message}
              success={touchedFields.province && !errors.province && !!watched.province}
            >
              <input
                type="text"
                autoComplete="address-level1"
                placeholder="Madrid"
                className={inputCls(
                  errors.province?.message,
                  touchedFields.province && !errors.province && !!watched.province
                )}
                {...register("province", {
                  required: "La provincia es obligatoria",
                  minLength: { value: 2, message: "Mínimo 2 caracteres" },
                })}
              />
            </InputWrapper>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 mt-1">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-0.5 w-4 h-4 shrink-0 accent-[#487D26] cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-black/60 leading-relaxed cursor-pointer">
                Acepto los{" "}
                <Link href="/terms" target="_blank" className="underline text-black/80 hover:text-[#487D26]">términos y condiciones</Link>
                {" "}y la{" "}
                <Link href="/privacy" target="_blank" className="underline text-black/80 hover:text-[#487D26]">política de privacidad</Link>
              </label>
            </div>

            {/* COD info box */}
            <div className="bg-[#F7F8F5] border border-[#487D26]/20 rounded-[16px] p-4 flex gap-3">
              <span className="text-2xl shrink-0">📦</span>
              <div>
                <p className="font-semibold text-sm mb-0.5">
                  Pago al recibir el pedido
                </p>
                <p className="text-xs text-black/60 leading-relaxed">
                  Pagas en efectivo al repartidor. Sin tarjeta, sin riesgos.
                  Entrega en 2-4 días laborables.
                </p>
              </div>
            </div>

            {/* Order error */}
            {orderError && (
              <div className="bg-red-50 border border-red-200 rounded-[16px] p-4 text-sm text-red-700">
                <strong>Error al procesar el pedido:</strong>
                <pre className="mt-1 text-xs whitespace-pre-wrap break-all">{orderError}</pre>
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
              {submitting
                ? "Enviando pedido…"
                : "Confirmar Pedido · Pago Contra Reembolso"}
            </button>

            <SecurityBadges className="mt-2" />
          </form>

          {/* Desktop: sticky order summary */}
          <div className="hidden lg:block sticky top-8">
            {bundle && <OrderSummary bundle={bundle} />}
          </div>
        </div>
      </div>
    </main>
  );
}
