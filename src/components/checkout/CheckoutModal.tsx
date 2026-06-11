"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  Lock,
  Package,
  ShieldCheck,
  Truck,
  Wallet,
  X,
} from "lucide-react";

import { stripePromise } from "@/lib/stripe";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { createOrderAction } from "@/app/actions/orders";
import {
  CARD_DISCOUNT_CENTS,
  formatPrice,
  getStoredBundle,
  type Bundle,
} from "@/components/checkout/OrderSummary";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const PHONE_RE    = /^(\+34|0034|34)?[6789]\d{8}$/;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTCODE_RE = /^\d{5}$/;

const STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary:         "#2d6a2d",
    colorBackground:      "#ffffff",
    colorText:            "#111827",
    colorDanger:          "#dc2626",
    colorTextSecondary:   "#6b7280",
    colorTextPlaceholder: "#9ca3af",
    fontFamily:           '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSizeBase:         "15px",
    fontSizeSm:           "13px",
    fontWeightNormal:     "400",
    fontWeightMedium:     "500",
    fontWeightBold:       "600",
    borderRadius:         "10px",
    spacingUnit:          "4px",
    spacingGridRow:       "16px",
  },
  rules: {
    ".Tab": {
      border: "2px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px",
      fontSize: "14px", fontWeight: "500", color: "#374151",
      boxShadow: "none", transition: "all 0.15s ease", backgroundColor: "#ffffff",
    },
    ".Tab:hover":    { border: "2px solid #2d6a2d", color: "#2d6a2d", backgroundColor: "#f9fafb" },
    ".Tab--selected": {
      border: "2px solid #2d6a2d", backgroundColor: "#f0faf0", color: "#2d6a2d",
      fontWeight: "600", boxShadow: "0 0 0 3px rgba(45,106,45,0.1)",
    },
    ".TabLabel":      { fontSize: "14px", fontWeight: "500", letterSpacing: "0" },
    ".Input": {
      border: "2px solid #e5e7eb", borderRadius: "10px", padding: "12px 14px",
      fontSize: "15px", fontWeight: "400", color: "#111827", backgroundColor: "#ffffff",
      boxShadow: "none", transition: "border 0.15s ease, box-shadow 0.15s ease",
    },
    ".Input:focus":      { border: "2px solid #2d6a2d", boxShadow: "0 0 0 3px rgba(45,106,45,0.1)", outline: "none" },
    ".Input--invalid":   { border: "2px solid #dc2626", boxShadow: "0 0 0 3px rgba(220,38,38,0.1)" },
    ".Input::placeholder": { color: "#9ca3af", fontSize: "14px" },
    ".Label":  { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px", letterSpacing: "0.01em" },
    ".Error":  { fontSize: "13px", color: "#dc2626", marginTop: "6px", fontWeight: "400" },
    ".TermsText": { fontSize: "12px", color: "#9ca3af" },
    ".Block":  { borderRadius: "10px", border: "2px solid #e5e7eb" },
    ".CheckboxInput":          { border: "2px solid #d1d5db", borderRadius: "4px" },
    ".CheckboxInput--checked": { backgroundColor: "#2d6a2d", border: "2px solid #2d6a2d" },
  },
};

const MAPBOX_THEME_CSS = `
  .Input {
    height: 2.75rem; padding: 0 1rem; background-color: white;
    border: 2px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem;
    color: #111827; width: 100%; box-shadow: none;
    transition: border 0.15s, box-shadow 0.15s; font-family: inherit;
  }
  .Input:focus {
    border-color: #487D26 !important;
    box-shadow: 0 0 0 2px rgba(72,125,38,0.1) !important;
    outline: none;
  }
  .Input::placeholder { color: #9ca3af; font-size: 0.875rem; }
  .Results {
    z-index: 99999; border-radius: 0.75rem;
    overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  }
`;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

export interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  method: "cod" | "card";
}

interface ShippingData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  province: string;
  _hp: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ORDER SUMMARY PANEL                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

function OrderSummaryPanel({ bundle, isCard }: { bundle: Bundle; isCard: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const discount = isCard ? CARD_DISCOUNT_CENTS : 0;
  const total    = Math.max(0, bundle.priceInCents - discount);

  return (
    <div className="bg-[#F7F8F5] rounded-xl border border-black/[0.08] overflow-hidden">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="md:hidden w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className={cn(integralCF.className, "text-sm text-black")}>Resumen del pedido</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#487D26]">{formatPrice(total)}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Desktop header always visible */}
      <div className="hidden md:block px-4 pt-4">
        <h4 className={cn(integralCF.className, "text-sm text-black")}>Resumen de pedido</h4>
      </div>

      {/* Content */}
      <div className={cn("px-4 pb-4 pt-3 space-y-2.5", expanded ? "block" : "hidden md:block")}>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-black/70">
            <span>Gominolas de vinagre de manzana</span>
            <span className="font-medium">{bundle.price}</span>
          </div>
          <div className="flex justify-between text-black/70">
            <span>Envío</span>
            <span className="text-emerald-600 font-semibold text-xs">GRATIS</span>
          </div>
          {isCard && (
            <div className="flex justify-between text-emerald-600">
              <span className="font-medium">Descuento tarjeta</span>
              <span className="font-semibold">-{formatPrice(discount)}</span>
            </div>
          )}
        </div>
        <div className="border-t border-black/10 pt-2 flex justify-between items-center">
          <span className="font-bold text-black">Total a pagar</span>
          <span className="text-lg font-bold text-[#487D26]">{formatPrice(total)}</span>
        </div>
        <p className="text-[11px] text-black/40 text-center">IVA incluido en el precio</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SHARED FORM INPUT                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function FormInput({
  label,
  placeholder,
  error,
  success,
  register,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  placeholder: string;
  error?: string;
  success?: boolean;
  register: any;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-800 block">{label}</label>
      <div className="relative">
        <input
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(
            "w-full h-11 px-4 rounded-lg border text-base outline-none transition-all",
            "bg-white placeholder:text-gray-400",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              : success
              ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              : "border-gray-300 focus:border-[#487D26] focus:ring-2 focus:ring-[#487D26]/10"
          )}
          {...register}
        />
        {success && !error && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

const addrInputCls = (error?: string, success?: boolean) =>
  cn(
    "w-full h-11 px-4 rounded-lg border text-base outline-none transition-all",
    "bg-white placeholder:text-gray-400",
    error
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : success
      ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      : "border-gray-300 focus:border-[#487D26] focus:ring-2 focus:ring-[#487D26]/10"
  );

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SKELETON — mientras carga clientSecret                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

function SkeletonForm() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="h-11 bg-gray-100 rounded-lg" />
      <div className="h-11 bg-gray-100 rounded-lg" />
      <div className="h-11 bg-gray-100 rounded-lg" />
      <div className="h-11 bg-gray-100 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-11 bg-gray-100 rounded-lg" />
        <div className="h-11 bg-gray-100 rounded-lg" />
      </div>
      <div className="h-11 bg-gray-100 rounded-lg" />
      <div className="h-4 w-28 bg-gray-200 rounded mt-2" />
      <div className="h-36 bg-gray-100 rounded-xl" />
      <div className="h-12 bg-gray-200 rounded-full" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CARD FORM — todo en una vista, dentro de <Elements>                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CardForm({
  bundle,
  onError,
}: {
  bundle: Bundle;
  onError: (msg: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();

  const [submitting,   setSubmitting]   = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);

  const [SearchBox,    setSearchBox]    = useState<React.ComponentType<any> | null>(null);
  const [addressValue, setAddressValue] = useState("");
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm<ShippingData>({ mode: "onTouched" });

  const watched    = watch();
  const inputValid = (f: keyof ShippingData) => !!touchedFields[f] && !errors[f] && !!watched[f];
  const totalCents = Math.max(0, bundle.priceInCents - CARD_DISCOUNT_CENTS);

  useEffect(() => {
    if (!mapboxToken) {
      console.error("[Mapbox] NEXT_PUBLIC_MAPBOX_TOKEN no está definido");
      return;
    }
    import("@mapbox/search-js-react").then(mod => {
      setSearchBox(() => mod.SearchBox as React.ComponentType<any>);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onMapboxRetrieve = (result: any) => {
    const feature = result.features?.[0];
    if (!feature) return;
    const props    = feature.properties;
    const ctx      = props?.context;
    const addrLine = props?.address_line1 ?? props?.name ?? "";
    if (addrLine) {
      setAddressValue(addrLine);
      setValue("address", addrLine, { shouldValidate: true, shouldTouch: true });
    }
    if (ctx?.postcode?.name) setValue("postcode", ctx.postcode.name, { shouldValidate: true });
    if (ctx?.place?.name)    setValue("city",     ctx.place.name,    { shouldValidate: true });
    if (ctx?.region?.name)   setValue("province", ctx.region.name,   { shouldValidate: true });
  };

  const onSubmit = async (data: ShippingData) => {
    if (data._hp) return;
    if (!stripe || !elements) {
      onError("El sistema de pago no está listo. Recarga la página.");
      return;
    }

    setSubmitting(true);
    onError("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirmation`,
          payment_method_data: {
            billing_details: {
              name:  data.fullName,
              email: data.email,
              phone: data.phone.replace(/[\s\-]/g, ""),
              address: {
                line1:       data.address,
                city:        data.city,
                state:       data.province,
                postal_code: data.postcode,
                country:     "ES",
              },
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "El pago fue rechazado.");
        return;
      }
      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        onError("El pago no pudo completarse. Inténtalo de nuevo.");
        return;
      }

      const names       = data.fullName.split(" ");
      const orderResult = await createOrderAction({
        customerData: {
          fullName:   data.fullName,
          phone:      data.phone.replace(/[\s\-]/g, ""),
          address:    data.address,
          postalCode: data.postcode,
          city:       data.city,
          province:   data.province,
          email:      data.email,
        },
        bundleId:              bundle.id,
        paymentMethod:         "CARD",
        stripePaymentIntentId: paymentIntent.id,
      });

      if (!orderResult.success) {
        console.error("[CardForm] Order creation failed:", orderResult.error);
      }

      try {
        sessionStorage.setItem("healzyp_order", JSON.stringify({
          orderNumber:     orderResult.orderNumber ?? paymentIntent.id,
          email:           data.email,
          firstName:       names[0],
          paymentMethod:   "card",
          items: [{
            name:       bundle.name,
            srcUrl:     "/images/FOTOPRODUCT1.png",
            quantity:   1,
            attributes: [],
            price:      bundle.priceInCents / 100,
            discount:   0,
          }],
          shippingAddress: {
            firstName:  names[0],
            lastName:   names.slice(1).join(" "),
            address:    data.address,
            apartment:  "",
            postalCode: data.postcode,
            city:       data.city,
            province:   data.province,
            country:    "España",
          },
          shippingMethod:    { name: "Envío gratuito", estimatedDays: "2-4 días laborables", price: 0 },
          subtotalEur:       bundle.priceInCents / 100,
          shippingCostEur:   0,
          couponDiscountEur: CARD_DISCOUNT_CENTS / 100,
          totalEur:          totalCents / 100,
        }));
      } catch {}

      router.push("/order/confirmation");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Hubo un problema al procesar tu pedido. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* Honeypot */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute opacity-0 h-0 w-0"
        {...register("_hp")}
      />

      {/* ── Datos de envío ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Datos de envío
          </h3>
        </div>

        <FormInput
          label="Nombre completo"
          placeholder="María García López"
          error={errors.fullName?.message}
          success={inputValid("fullName")}
          register={register("fullName", {
            required:  "Obligatorio",
            minLength: { value: 2, message: "Mínimo 2 caracteres" },
          })}
          name="fullName"
          autoComplete="name"
        />

        <FormInput
          label="Email"
          placeholder="maria@email.com"
          type="email"
          error={errors.email?.message}
          success={inputValid("email")}
          register={register("email", {
            required: "Obligatorio",
            pattern:  { value: EMAIL_RE, message: "Email no válido" },
          })}
          name="email"
          autoComplete="email"
        />

        <FormInput
          label="Teléfono"
          placeholder="612 345 678"
          type="tel"
          error={errors.phone?.message}
          success={inputValid("phone")}
          register={register("phone", {
            required: "Obligatorio",
            pattern:  { value: PHONE_RE, message: "Teléfono no válido" },
          })}
          name="phone"
          autoComplete="tel"
        />

        {/* Dirección con Mapbox SearchBox */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-800 block">Dirección</label>
          <div className="relative">
            {SearchBox && mapboxToken ? (
              <>
                <input
                  type="text"
                  style={{ display: "none" }}
                  {...register("address", {
                    required:  "Obligatorio",
                    minLength: { value: 5, message: "Demasiado corta" },
                  })}
                  readOnly
                />
                <SearchBox
                  accessToken={mapboxToken}
                  value={addressValue}
                  onChange={(v: string) => {
                    setAddressValue(v);
                    setValue("address", v, { shouldValidate: true, shouldTouch: true });
                  }}
                  onRetrieve={onMapboxRetrieve}
                  options={{ country: "es", language: "es" }}
                  popoverOptions={{ renderIntoPortal: true }}
                  placeholder="Calle Mayor 123, 2ºB"
                  theme={{ cssText: MAPBOX_THEME_CSS }}
                />
              </>
            ) : (
              <input
                type="text"
                autoComplete="street-address"
                placeholder="Calle Mayor 123, 2ºB"
                className={addrInputCls(errors.address?.message, inputValid("address"))}
                value={addressValue}
                onChange={e => {
                  setAddressValue(e.target.value);
                  setValue("address", e.target.value, { shouldValidate: true, shouldTouch: true });
                }}
              />
            )}
            {inputValid("address") && !errors.address && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
            )}
          </div>
          {errors.address && (
            <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Código Postal"
            placeholder="28001"
            error={errors.postcode?.message}
            success={inputValid("postcode")}
            register={register("postcode", {
              required: "Obligatorio",
              pattern:  { value: POSTCODE_RE, message: "5 dígitos" },
            })}
            name="postcode"
            autoComplete="postal-code"
          />
          <FormInput
            label="Ciudad"
            placeholder="Madrid"
            error={errors.city?.message}
            success={inputValid("city")}
            register={register("city", { required: "Obligatorio" })}
            name="city"
            autoComplete="address-level2"
          />
        </div>

        <FormInput
          label="Provincia"
          placeholder="Madrid"
          error={errors.province?.message}
          success={inputValid("province")}
          register={register("province", { required: "Obligatorio" })}
          name="province"
          autoComplete="address-level1"
        />
      </div>

      {/* ── Datos de pago ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
          <div className="w-4 h-4 bg-[#2d6a2d] rounded-full flex items-center justify-center shrink-0">
            <Lock className="w-2.5 h-2.5 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Datos de pago
          </h3>
          <span className="ml-auto text-[12px] text-[#6b7280] whitespace-nowrap">
            Encriptado con{" "}
            <span className="font-semibold text-[#374151]">Stripe</span>
          </span>
        </div>

        <div className="relative min-h-[180px]">
          <PaymentElement
            options={{
              layout: "tabs",
              paymentMethodOrder: ["apple_pay", "google_pay", "card", "klarna"],
            }}
            onReady={() => setPaymentReady(true)}
          />
          {!paymentReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin text-[#487D26]" />
            </div>
          )}
        </div>
      </div>

      {/* ── Botón de pago ────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={submitting || !stripe || !elements || !paymentReady}
        className={cn(
          "w-full h-12 rounded-full font-bold text-base transition-all",
          "flex items-center justify-center gap-2",
          "bg-[#487D26] text-white shadow-[0_4px_14px_rgba(72,125,38,0.35)]",
          "hover:bg-[#3a6420] disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Procesando pago...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pagar — {formatPrice(totalCents)}
          </>
        )}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  COD FORM                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CodForm({
  bundle,
  onError,
}: {
  bundle: Bundle;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [SearchBox,    setSearchBox]    = useState<React.ComponentType<any> | null>(null);
  const [addressValue, setAddressValue] = useState("");
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm<ShippingData>({ mode: "onTouched" });

  const watched    = watch();
  const inputValid = (f: keyof ShippingData) => !!touchedFields[f] && !errors[f] && !!watched[f];

  useEffect(() => {
    if (!mapboxToken) {
      console.error("[Mapbox] NEXT_PUBLIC_MAPBOX_TOKEN no está definido");
      return;
    }
    import("@mapbox/search-js-react").then(mod => {
      setSearchBox(() => mod.SearchBox as React.ComponentType<any>);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onMapboxRetrieve = (result: any) => {
    const feature = result.features?.[0];
    if (!feature) return;
    const props    = feature.properties;
    const ctx      = props?.context;
    const addrLine = props?.address_line1 ?? props?.name ?? "";
    if (addrLine) {
      setAddressValue(addrLine);
      setValue("address", addrLine, { shouldValidate: true, shouldTouch: true });
    }
    if (ctx?.postcode?.name) setValue("postcode", ctx.postcode.name, { shouldValidate: true });
    if (ctx?.place?.name)    setValue("city",     ctx.place.name,    { shouldValidate: true });
    if (ctx?.region?.name)   setValue("province", ctx.region.name,   { shouldValidate: true });
  };

  const onSubmit = async (data: ShippingData) => {
    if (data._hp) return;

    setSubmitting(true);
    onError("");

    try {
      const result = await createOrderAction({
        customerData: {
          fullName:   data.fullName,
          phone:      data.phone.replace(/[\s\-]/g, ""),
          address:    data.address,
          postalCode: data.postcode,
          city:       data.city,
          province:   data.province,
          email:      data.email,
        },
        bundleId:           bundle.id,
        bundlePriceInCents: bundle.priceInCents,
        paymentMethod:      "COD",
      });

      if (!result.success) {
        console.error("[CodForm] createOrderAction failed:", result.error);
        onError(result.error ?? "Error al crear el pedido.");
        return;
      }

      const names = data.fullName.split(" ");

      try {
        sessionStorage.setItem("healzyp_order", JSON.stringify({
          orderNumber:     result.orderNumber,
          email:           data.email,
          firstName:       names[0],
          paymentMethod:   "cod",
          items: [{
            name:       bundle.name,
            srcUrl:     "/images/FOTOPRODUCT1.png",
            quantity:   1,
            attributes: [],
            price:      bundle.priceInCents / 100,
            discount:   0,
          }],
          shippingAddress: {
            firstName:  names[0],
            lastName:   names.slice(1).join(" "),
            address:    data.address,
            apartment:  "",
            postalCode: data.postcode,
            city:       data.city,
            province:   data.province,
            country:    "España",
          },
          shippingMethod:   { name: "Envío estándar", estimatedDays: "3-5 días hábiles", price: 0 },
          subtotalEur:      bundle.priceInCents / 100,
          shippingCostEur:  0,
          couponDiscountEur: 0,
          totalEur:         bundle.priceInCents / 100,
        }));
      } catch {}

      router.push("/order/confirmation");
    } catch (e) {
      console.error("[CodForm] unexpected error:", e);
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Honeypot */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute opacity-0 h-0 w-0"
        {...register("_hp")}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Datos de envío
          </h3>
        </div>

        <FormInput
          label="Nombre completo"
          placeholder="María García López"
          error={errors.fullName?.message}
          success={inputValid("fullName")}
          register={register("fullName", {
            required:  "Obligatorio",
            minLength: { value: 2, message: "Mínimo 2 caracteres" },
          })}
          name="fullName"
          autoComplete="name"
        />

        <FormInput
          label="Email"
          placeholder="maria@email.com"
          type="email"
          error={errors.email?.message}
          success={inputValid("email")}
          register={register("email", {
            required: "Obligatorio",
            pattern:  { value: EMAIL_RE, message: "Email no válido" },
          })}
          name="email"
          autoComplete="email"
        />

        <FormInput
          label="Teléfono"
          placeholder="612 345 678"
          type="tel"
          error={errors.phone?.message}
          success={inputValid("phone")}
          register={register("phone", {
            required: "Obligatorio",
            pattern:  { value: PHONE_RE, message: "Teléfono no válido" },
          })}
          name="phone"
          autoComplete="tel"
        />

        {/* Dirección con Mapbox SearchBox */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-800 block">Dirección</label>
          <div className="relative">
            {SearchBox && mapboxToken ? (
              <>
                <input
                  type="text"
                  style={{ display: "none" }}
                  {...register("address", {
                    required:  "Obligatorio",
                    minLength: { value: 5, message: "Demasiado corta" },
                  })}
                  readOnly
                />
                <SearchBox
                  accessToken={mapboxToken}
                  value={addressValue}
                  onChange={(v: string) => {
                    setAddressValue(v);
                    setValue("address", v, { shouldValidate: true, shouldTouch: true });
                  }}
                  onRetrieve={onMapboxRetrieve}
                  options={{ country: "es", language: "es" }}
                  popoverOptions={{ renderIntoPortal: true }}
                  placeholder="Calle Mayor 123, 2ºB"
                  theme={{ cssText: MAPBOX_THEME_CSS }}
                />
              </>
            ) : (
              <input
                type="text"
                autoComplete="street-address"
                placeholder="Calle Mayor 123, 2ºB"
                className={addrInputCls(errors.address?.message, inputValid("address"))}
                value={addressValue}
                onChange={e => {
                  setAddressValue(e.target.value);
                  setValue("address", e.target.value, { shouldValidate: true, shouldTouch: true });
                }}
              />
            )}
            {inputValid("address") && !errors.address && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
            )}
          </div>
          {errors.address && (
            <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Código Postal"
            placeholder="28001"
            error={errors.postcode?.message}
            success={inputValid("postcode")}
            register={register("postcode", {
              required: "Obligatorio",
              pattern:  { value: POSTCODE_RE, message: "5 dígitos" },
            })}
            name="postcode"
            autoComplete="postal-code"
          />
          <FormInput
            label="Ciudad"
            placeholder="Madrid"
            error={errors.city?.message}
            success={inputValid("city")}
            register={register("city", { required: "Obligatorio" })}
            name="city"
            autoComplete="address-level2"
          />
        </div>

        <FormInput
          label="Provincia"
          placeholder="Madrid"
          error={errors.province?.message}
          success={inputValid("province")}
          register={register("province", { required: "Obligatorio" })}
          name="province"
          autoComplete="address-level1"
        />
      </div>

      {/* Info contra reembolso */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-800">Pago contra reembolso</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          Pagas el importe total al recibir el paquete. El repartidor acepta
          efectivo o tarjeta. Recibirás un SMS con la fecha y franja horaria de entrega.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={cn(
          "w-full h-12 rounded-full font-bold text-base transition-all",
          "flex items-center justify-center gap-2",
          "bg-[#487D26] text-white shadow-[0_4px_14px_rgba(72,125,38,0.35)]",
          "hover:bg-[#3a6420] disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <Truck className="w-5 h-5" />
            Confirmar pedido
          </>
        )}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN MODAL                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

const CheckoutModal: React.FC<CheckoutModalProps> = ({ open, onOpenChange, method }) => {
  const [bundle,              setBundle]              = useState<Bundle | null>(null);
  const [clientSecret,        setClientSecret]        = useState<string | null>(null);
  const [clientSecretLoading, setClientSecretLoading] = useState(false);
  const [error,               setError]               = useState<string | null>(null);
  const clientSecretCache = useRef<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    const b = getStoredBundle();
    setBundle(b);
    setError(null);

    if (method === "card" && b) {
      const cached = clientSecretCache.current[b.id];
      if (cached) {
        setClientSecret(cached);
        return;
      }
      setClientSecretLoading(true);
      fetch("/api/create-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bundleId: b.id }),
      })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error del servidor");
          clientSecretCache.current[b.id] = data.clientSecret;
          setClientSecret(data.clientSecret);
        })
        .catch(err => {
          console.error("[CheckoutModal] Error cargando clientSecret:", err);
          setError("Hubo un problema al iniciar el pago. Inténtalo de nuevo.");
        })
        .finally(() => setClientSecretLoading(false));
    }
  }, [open, method]);

  const handleError = useCallback((msg: string) => setError(msg || null), []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setError(null);
      setClientSecret(null);
    }, 300);
  }, [onOpenChange]);

  const isCard = method === "card";

  if (!bundle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className={cn(
          "w-full max-w-[95vw] sm:max-w-[500px] p-0 gap-0",
          "bg-white border border-black/10 shadow-2xl",
          "rounded-none sm:rounded-[20px]",
          "h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-visible flex flex-col"
        )}
      >
        <DialogTitle className="sr-only">
          {isCard ? "Pago con tarjeta" : "Pago contra reembolso"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Completa tu compra de forma segura
        </DialogDescription>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#487D26]/10 flex items-center justify-center">
              {isCard
                ? <CreditCard className="w-4 h-4 text-[#487D26]" />
                : <Wallet    className="w-4 h-4 text-[#487D26]" />
              }
            </div>
            <span className={cn(integralCF.className, "text-sm text-black")}>
              Checkout seguro
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">
            {/* Resumen colapsable en móvil, siempre visible en desktop */}
            <OrderSummaryPanel bundle={bundle} isCard={isCard} />

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario */}
            <div key={method}>
              {isCard ? (
                clientSecretLoading ? (
                  <SkeletonForm />
                ) : clientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: STRIPE_APPEARANCE,
                      locale:     "es",
                    }}
                  >
                    <CardForm bundle={bundle} onError={handleError} />
                  </Elements>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-red-700">
                      No se pudo cargar el sistema de pago. Cierra el modal e inténtalo de nuevo.
                    </p>
                  </div>
                )
              ) : (
                <CodForm bundle={bundle} onError={handleError} />
              )}
            </div>

            {/* Security strip */}
            <div className="flex flex-col items-center gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#487D26]" />
                <span className="text-[13px] font-medium text-gray-600">
                  🛡️ Pago 100% seguro · SSL encriptado
                </span>
              </div>
              <div className="flex items-center gap-4 mt-0.5">
                <span className="text-[11px] font-bold tracking-[0.08em] text-[#9ca3af]">VISA</span>
                <span className="text-[11px] font-bold tracking-[0.08em] text-[#9ca3af]">MASTERCARD</span>
                <span className="text-[11px] font-bold tracking-[0.08em] text-[#9ca3af]">STRIPE</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
