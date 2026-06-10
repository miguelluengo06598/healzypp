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
  CARD_DISCOUNT_CENTS,
  formatPrice,
} from "@/components/checkout/OrderSummary";
import { stripePromise } from "@/lib/stripe";
import { FaCheck, FaCheckCircle, FaLock } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";
import PaymentIcons from "@/components/common/PaymentIcons";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import OrderTimeline from "@/components/orders/OrderTimeline";

// Stripe imports — loaded client-side only
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postcode: string;
  _hp: string; // honeypot
};

type CardField = "number" | "expiry" | "cvc";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHONE_RE = /^(\+34|0034|34)?[6789]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Text styles injected into each Stripe card iframe. */
const STRIPE_STYLE = {
  base: {
    fontSize: "14px",
    fontFamily: "inherit",
    fontWeight: "400",
    color: "#111111",
    "::placeholder": { color: "#9CA3AF" },
  },
  invalid: { color: "#ef4444" },
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

/**
 * Step number bubble — matches the site's black/white palette.
 */
function StepBubble({ n }: { n: number }) {
  return (
    <div className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center shrink-0">
      {n}
    </div>
  );
}

/**
 * Standard field wrapper reused across the entire form.
 */
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

/**
 * Simplified wrapper for Stripe card elements — labels + error text only,
 * no icon overlay (the Stripe iframe fills the whole input area).
 */
function CardFieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-black/70">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Standard text input class — same across every field on the page. */
const inputCls = (error?: string, success?: boolean) =>
  cn(
    "w-full rounded-full px-5 py-3 border text-sm outline-none transition-all pr-10",
    error
      ? "border-red-400 focus:ring-1 focus:ring-red-400/30"
      : success
      ? "border-[#487D26] focus:ring-1 focus:ring-[#487D26]/30"
      : "border-black/20 focus:border-[#487D26] focus:ring-1 focus:ring-[#487D26]/30"
  );

/**
 * Wrapper div for a Stripe card element.
 * Identical visuals to inputCls but driven by explicit props because
 * focus state comes from Stripe's onFocus/onBlur callbacks, not :focus.
 */
const cardWrapCls = (error?: string, focused?: boolean, success?: boolean) =>
  cn(
    "w-full rounded-full px-5 py-3 border text-sm transition-all cursor-text",
    error
      ? "border-red-400 ring-1 ring-red-400/30"
      : focused
      ? "border-[#487D26] ring-1 ring-[#487D26]/30"
      : success
      ? "border-[#487D26]"
      : "border-black/20"
  );

// ─── Inner form (needs Stripe context) ───────────────────────────────────────

function CheckoutForm({
  bundle,
  totalCents,
}: {
  bundle: Bundle;
  totalCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { trackPurchase } = useMetaPixel();

  const [submitting, setSubmitting] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Per-field Stripe state
  const [cardErrors, setCardErrors] = useState<
    Partial<Record<CardField, string>>
  >({});
  const [cardComplete, setCardComplete] = useState<
    Record<CardField, boolean>
  >({ number: false, expiry: false, cvc: false });
  const [cardFocus, setCardFocus] = useState<CardField | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm<FormValues>({ mode: "onTouched" });

  const watched = watch();

  // Mapbox AddressAutofill — dynamic import to avoid SSR issues
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

    if (!stripe || !elements) {
      setStripeError("El sistema de pago no está listo. Recarga la página.");
      return;
    }

    if (!cardComplete.number || !cardComplete.expiry || !cardComplete.cvc) {
      setStripeError("Por favor, completa todos los datos de la tarjeta.");
      return;
    }

    setSubmitting(true);
    setStripeError(null);

    // ── 1. Crear PaymentMethod con los datos de la tarjeta ──────────────────
    const cardElement = elements.getElement(CardNumberElement)!;
    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        address: {
          line1: data.address,
          city: data.city,
          state: data.province,
          postal_code: data.postcode,
          country: "ES",
        },
      },
    });

    if (pmError) {
      setStripeError(pmError.message ?? "Error al procesar la tarjeta.");
      setSubmitting(false);
      return;
    }

    // ── 2. Pedir al servidor que cree el PaymentIntent ──────────────────────
    const intentRes = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId: bundle.id }),
    });

    const intentData = await intentRes.json();

    if (!intentRes.ok || !intentData.clientSecret) {
      setStripeError(intentData.error ?? "Error al iniciar el pago.");
      setSubmitting(false);
      return;
    }

    // ── 3. Confirmar el cobro con Stripe ────────────────────────────────────
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      intentData.clientSecret,
      { payment_method: paymentMethod.id }
    );

    if (confirmError) {
      setStripeError(confirmError.message ?? "El pago fue rechazado.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setStripeError("El pago no pudo completarse. Inténtalo de nuevo.");
      setSubmitting(false);
      return;
    }

    // ── 4. Pago confirmado por Stripe → crear la orden en base de datos ─────
    const { createOrderAction } = await import("@/app/actions/orders");
    const orderResult = await createOrderAction({
      customerData: {
        fullName: `${data.firstName} ${data.lastName}`,
        phone: data.phone.replace(/[\s\-]/g, ""),
        address: data.address,
        postalCode: data.postcode,
        city: data.city,
        province: data.province,
        email: data.email,
      },
      bundleId: bundle.id,
      paymentMethod: "CARD",
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!orderResult.success) {
      // El pago SÍ se procesó — avisar al cliente para que contacte soporte
      setStripeError(
        `El pago fue procesado pero hubo un error al registrar tu pedido (${orderResult.error ?? "error desconocido"}). Guarda tu referencia de pago: ${paymentIntent.id} y contáctanos.`
      );
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);

    // ── 5. Meta Pixel: Purchase ─────────────────────────────────────────────
    trackPurchase({
      orderId: orderResult.orderId ?? paymentIntent.id,
      orderNumber: orderResult.orderNumber ?? paymentIntent.id,
      value: totalCents / 100,
      currency: 'EUR',
      items: [
        {
          id: bundle.id,
          name: bundle.name,
          quantity: 1,
          price: bundle.priceInCents / 100,
        },
      ],
      email: data.email,
      phone: data.phone.replace(/[\s\-]/g, ''),
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city,
      zip: data.postcode,
    });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
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
            <h2 className={cn(integralCF.className, "text-3xl md:text-4xl mb-3")}>
              ¡Pago completado!
            </h2>
            <p className="text-black/60 max-w-md mx-auto">
              Tu pedido ha sido procesado correctamente. Recibirás un email de
              confirmación en breve.
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

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 md:p-8">
      {/* Honeypot */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none h-0 w-0"
        {...register("_hp")}
      />

      {/* ── 01 · Datos personales ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <StepBubble n={1} />
          <h3 className="font-bold text-base">Datos personales</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputWrapper
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
          </InputWrapper>

          <InputWrapper
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
          </InputWrapper>

          <InputWrapper
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
          </InputWrapper>

          <InputWrapper
            label="Teléfono"
            error={errors.phone?.message}
            success={!!touchedFields.phone && !errors.phone && !!watched.phone}
          >
            <input
              type="tel"
              autoComplete="tel"
              placeholder="612 345 678"
              className={inputCls(
                errors.phone?.message,
                !!touchedFields.phone && !errors.phone && !!watched.phone
              )}
              {...register("phone", {
                required: "El teléfono es obligatorio",
                validate: (v) =>
                  PHONE_RE.test(v.replace(/[\s\-]/g, "")) ||
                  "Teléfono español no válido",
              })}
            />
          </InputWrapper>
        </div>
      </section>

      <hr className="border-t-black/10 my-7" />

      {/* ── 02 · Dirección de envío ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <StepBubble n={2} />
          <h3 className="font-bold text-base">Dirección de envío</h3>
        </div>

        <div className="flex flex-col gap-4">
          <InputWrapper
            label="Dirección"
            error={errors.address?.message}
            success={!!touchedFields.address && !errors.address && !!watched.address}
          >
            {AddressAutofill && mapboxToken ? (
              <AddressAutofill
                accessToken={mapboxToken}
                options={{ country: "es", language: "es" }}
                onRetrieve={(res: any) => {
                  const f = res.features?.[0]?.properties;
                  if (!f) return;
                  if (f.address_line1) setValue("address", f.address_line1, { shouldValidate: true });
                  if (f.place) setValue("city", f.place, { shouldValidate: true });
                  if (f.postcode) setValue("postcode", f.postcode, { shouldValidate: true });
                  if (f.region) setValue("province", f.region, { shouldValidate: true });
                }}
              >
                <input
                  type="text"
                  autoComplete="address-line1"
                  placeholder="Calle Mayor 12, 3º B"
                  className={inputCls(
                    errors.address?.message,
                    !!touchedFields.address && !errors.address && !!watched.address
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
                  !!touchedFields.address && !errors.address && !!watched.address
                )}
                {...register("address", {
                  required: "La dirección es obligatoria",
                  minLength: { value: 5, message: "Dirección muy corta" },
                })}
              />
            )}
          </InputWrapper>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InputWrapper
              label="Código postal"
              error={errors.postcode?.message}
              success={!!touchedFields.postcode && !errors.postcode && !!watched.postcode}
            >
              <input
                type="text"
                autoComplete="postal-code"
                placeholder="28001"
                maxLength={5}
                className={inputCls(
                  errors.postcode?.message,
                  !!touchedFields.postcode && !errors.postcode && !!watched.postcode
                )}
                {...register("postcode", {
                  required: "Obligatorio",
                  pattern: { value: /^\d{5}$/, message: "5 dígitos" },
                })}
              />
            </InputWrapper>

            <InputWrapper
              label="Ciudad"
              error={errors.city?.message}
              success={!!touchedFields.city && !errors.city && !!watched.city}
            >
              <input
                type="text"
                autoComplete="address-level2"
                placeholder="Madrid"
                className={inputCls(
                  errors.city?.message,
                  !!touchedFields.city && !errors.city && !!watched.city
                )}
                {...register("city", { required: "Obligatorio" })}
              />
            </InputWrapper>

            <InputWrapper
              label="Provincia"
              error={errors.province?.message}
              success={!!touchedFields.province && !errors.province && !!watched.province}
            >
              <input
                type="text"
                autoComplete="address-level1"
                placeholder="Madrid"
                className={inputCls(
                  errors.province?.message,
                  !!touchedFields.province && !errors.province && !!watched.province
                )}
                {...register("province", { required: "Obligatorio" })}
              />
            </InputWrapper>
          </div>
        </div>
      </section>

      <hr className="border-t-black/10 my-7" />

      {/* ── 03 · Datos de pago ────────────────────────────────────────────────── */}
      <section>
        {/* Section header: step + title + card logos */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <StepBubble n={3} />
            <h3 className="font-bold text-base">Datos de pago</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {["VISA", "MC", "AMEX"].map((m) => (
              <span
                key={m}
                className="text-[9px] font-bold tracking-wide text-black/35 border border-black/10 rounded-[4px] px-1.5 py-[3px] bg-white leading-none"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Trust + discount — single muted line */}
        <p className="text-xs text-black/40 mb-5 flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <FaLock className="text-[9px]" />
            Pago seguro con cifrado SSL
          </span>
          <span className="text-[#487D26] font-medium flex items-center gap-1">
            <FaCheck className="text-[9px]" />
            Ahorra {formatPrice(CARD_DISCOUNT_CENTS)} con tarjeta
          </span>
        </p>

        {/* Card fields — identical visual style to all other inputs */}
        <div className="flex flex-col gap-4">
          <CardFieldWrapper label="Número de tarjeta" error={cardErrors.number}>
            <div
              className={cardWrapCls(
                cardErrors.number,
                cardFocus === "number",
                cardComplete.number && !cardErrors.number
              )}
            >
              <CardNumberElement
                options={{ style: STRIPE_STYLE, showIcon: true }}
                onFocus={() => setCardFocus("number")}
                onBlur={() => setCardFocus(null)}
                onChange={(e) => {
                  setCardErrors((p) => ({ ...p, number: e.error?.message }));
                  setCardComplete((p) => ({ ...p, number: e.complete }));
                }}
              />
            </div>
          </CardFieldWrapper>

          <div className="grid grid-cols-2 gap-4">
            <CardFieldWrapper label="Fecha de expiración" error={cardErrors.expiry}>
              <div
                className={cardWrapCls(
                  cardErrors.expiry,
                  cardFocus === "expiry",
                  cardComplete.expiry && !cardErrors.expiry
                )}
              >
                <CardExpiryElement
                  options={{ style: STRIPE_STYLE }}
                  onFocus={() => setCardFocus("expiry")}
                  onBlur={() => setCardFocus(null)}
                  onChange={(e) => {
                    setCardErrors((p) => ({ ...p, expiry: e.error?.message }));
                    setCardComplete((p) => ({ ...p, expiry: e.complete }));
                  }}
                />
              </div>
            </CardFieldWrapper>

            <CardFieldWrapper label="CVC" error={cardErrors.cvc}>
              <div
                className={cardWrapCls(
                  cardErrors.cvc,
                  cardFocus === "cvc",
                  cardComplete.cvc && !cardErrors.cvc
                )}
              >
                <CardCvcElement
                  options={{ style: STRIPE_STYLE }}
                  onFocus={() => setCardFocus("cvc")}
                  onBlur={() => setCardFocus(null)}
                  onChange={(e) => {
                    setCardErrors((p) => ({ ...p, cvc: e.error?.message }));
                    setCardComplete((p) => ({ ...p, cvc: e.complete }));
                  }}
                />
              </div>
            </CardFieldWrapper>
          </div>
        </div>

        {stripeError && (
          <p className="text-xs text-red-500 mt-3">{stripeError}</p>
        )}
      </section>

      <hr className="border-t-black/10 my-7" />

      {/* ── Submit ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={submitting || !stripe}
          className={cn(
            "w-full rounded-full h-[52px] text-base font-bold text-white transition-all flex items-center justify-center gap-2",
            submitting || !stripe
              ? "bg-[#487D26]/60 cursor-not-allowed"
              : "bg-[#487D26] hover:bg-[#3a6620]"
          )}
        >
          <FaLock className="text-sm" />
          {submitting
            ? "Procesando pago…"
            : `Pagar ${formatPrice(totalCents)}`}
        </button>

        {/* Payment logos */}
        <PaymentIcons />

        {/* Compact trust strip */}
        <p className="text-[11px] text-black/35 text-center flex items-center justify-center gap-2 flex-wrap">
          <span>🔒 Pago seguro</span>
          <span className="text-black/20">·</span>
          <span>🚚 Envío gratis</span>
          <span className="text-black/20">·</span>
          <span>↩️ 30 días devolución</span>
          <span className="text-black/20">·</span>
          <span>PCI DSS nivel 1</span>
        </p>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CardCheckoutPage() {
  const router = useRouter();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const { trackInitiateCheckout } = useMetaPixel();

  useEffect(() => {
    const b = getStoredBundle();
    setBundle(b);
    // Meta Pixel: InitiateCheckout al entrar en checkout
    trackInitiateCheckout({
      value: Math.max(0, b.priceInCents - CARD_DISCOUNT_CENTS) / 100,
      currency: 'EUR',
      items: [
        {
          id: b.id,
          name: b.name,
          quantity: 1,
          price: b.priceInCents / 100,
        },
      ],
    });
  }, [trackInitiateCheckout]);

  if (!bundle) return null;

  const totalCents = Math.max(0, Math.round(bundle.priceInCents) - Math.round(CARD_DISCOUNT_CENTS));

  // Individual card elements don't use the deferred-intent mode/amount/currency
  // options — those are only required by PaymentElement.
  const stripeOptions = {
    appearance: {
      theme: "flat" as const,
      variables: {
        fontFamily: "inherit",
        fontSizeBase: "14px",
        colorText: "#111111",
        colorTextPlaceholder: "#9CA3AF",
        colorDanger: "#ef4444",
      },
    },
  };

  return (
    <main className="min-h-screen bg-[#F7F8F5]">

      {/* ── Minimal header ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-black/10 px-4 py-4">
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
          {/* Security signal — desktop only */}
          <p className="hidden sm:flex items-center gap-1.5 text-xs text-black/40">
            <FaLock className="text-[10px] text-[#487D26]" />
            Pago seguro · SSL
          </p>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="max-w-frame mx-auto px-4 xl:px-0 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">

          {/* Mobile: order summary at top */}
          <div className="lg:hidden">
            <OrderSummary bundle={bundle} discountInCents={CARD_DISCOUNT_CENTS} />
          </div>

          {/* ── Form card ───────────────────────────────────────────────────── */}
          {stripePromise ? (
            <div className="bg-white rounded-[24px] shadow-sm overflow-hidden">
              <Elements stripe={stripePromise} options={stripeOptions}>
                <CheckoutForm bundle={bundle} totalCents={totalCents} />
              </Elements>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] p-6 text-sm text-yellow-800 border border-yellow-200">
              <strong>Configuración pendiente:</strong> añade{" "}
              <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> a tu{" "}
              <code>.env.local</code> para activar el pago con tarjeta.
            </div>
          )}

          {/* Desktop: sticky order summary */}
          <div className="hidden lg:block sticky top-8">
            <OrderSummary bundle={bundle} discountInCents={CARD_DISCOUNT_CENTS} />
          </div>

        </div>
      </div>
    </main>
  );
}
