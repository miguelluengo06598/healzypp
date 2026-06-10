"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { integralCF } from "@/styles/fonts";
import {
  Lock,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Package,
} from "lucide-react";

import { stripePromise } from "@/lib/stripe";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import { createOrderAction } from "@/app/actions/orders";
import {
  getStoredBundle,
  formatPrice,
  type Bundle,
} from "@/components/checkout/OrderSummary";
import { useMetaPixel } from "@/hooks/useMetaPixel";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

const PHONE_RE = /^(\+34|0034|34)?[6789]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTCODE_RE = /^\d{5}$/;

const STRIPE_STYLE = {
  base: {
    fontSize: "16px",
    fontFamily: "inherit",
    fontWeight: "400",
    color: "#111111",
    "::placeholder": { color: "#9CA3AF" },
  },
  invalid: { color: "#ef4444" },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPES                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

export interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  method: "cod" | "card";
}

type CardField = "number" | "expiry" | "cvc";

interface FormData {
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
/*  ORDER SUMMARY (inline with IVA)                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function InlineOrderSummary({ bundle, isCard }: { bundle: Bundle; isCard: boolean }) {
  const subtotal = bundle.priceInCents;
  const iva = Math.round(subtotal * 0.21);
  const discount = isCard ? 500 : 0; // 5€ discount for card
  const total = Math.max(0, subtotal + iva - discount);

  return (
    <div className="bg-[#F7F8F5] rounded-xl border border-black/8 p-4 space-y-2.5">
      <h4 className={cn(integralCF.className, "text-sm text-black")}>
        Resumen de pedido
      </h4>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-black/70">
          <span>Gominolas de vinagre de manzana</span>
          <span className="font-medium">{bundle.price}</span>
        </div>
        <div className="flex justify-between text-black/70">
          <span>Envío</span>
          <span className="text-emerald-600 font-semibold text-xs">GRATIS</span>
        </div>
        <div className="flex justify-between text-black/70">
          <span>IVA (21%)</span>
          <span className="font-medium">{formatPrice(iva)}</span>
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  INPUT FIELD COMPONENT                                                      */
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
              : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CARD FORM (inner, requires Elements)                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CardFormInner({
  bundle,
  onSuccess,
  onError,
}: {
  bundle: Bundle;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { trackPurchase } = useMetaPixel();
  const [submitting, setSubmitting] = useState(false);

  const [cardErrors, setCardErrors] = useState<Partial<Record<CardField, string>>>({});
  const [cardComplete, setCardComplete] = useState<Record<CardField, boolean>>({
    number: false,
    expiry: false,
    cvc: false,
  });
  const [cardFocus, setCardFocus] = useState<CardField | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm<FormData>({ mode: "onTouched" });

  const watched = watch();

  const inputValid = (field: keyof FormData) =>
    !!touchedFields[field] && !errors[field] && !!watched[field];

  const onSubmit = async (data: FormData) => {
    if (data._hp) return;
    if (!stripe || !elements) {
      onError("El sistema de pago no está listo. Recarga la página.");
      return;
    }
    if (!cardComplete.number || !cardComplete.expiry || !cardComplete.cvc) {
      onError("Completa todos los datos de la tarjeta.");
      return;
    }

    setSubmitting(true);
    onError("");

    try {
      const cardElement = elements.getElement(CardNumberElement)!;
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: data.fullName,
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
        onError(pmError.message ?? "Error al procesar la tarjeta.");
        setSubmitting(false);
        return;
      }

      const intentRes = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId: bundle.id }),
      });
      const intentData = await intentRes.json();

      if (!intentRes.ok || !intentData.clientSecret) {
        onError(intentData.error ?? "Error al iniciar el pago.");
        setSubmitting(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        { payment_method: paymentMethod.id }
      );

      if (confirmError) {
        onError(confirmError.message ?? "El pago fue rechazado.");
        setSubmitting(false);
        return;
      }

      if (paymentIntent?.status !== "succeeded") {
        onError("El pago no pudo completarse.");
        setSubmitting(false);
        return;
      }

      const names = data.fullName.split(" ");
      const orderResult = await createOrderAction({
        customerData: {
          fullName: data.fullName,
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
        onError(`El pago fue procesado. Guarda tu referencia: ${paymentIntent.id}`);
        setSubmitting(false);
        return;
      }

      trackPurchase({
        orderId: orderResult.orderId ?? paymentIntent.id,
        orderNumber: orderResult.orderNumber ?? paymentIntent.id,
        value: bundle.priceInCents / 100,
        currency: "EUR",
        items: [{ id: bundle.id, name: bundle.name, quantity: 1, price: bundle.priceInCents / 100 }],
        email: data.email,
        phone: data.phone.replace(/[\s\-]/g, ""),
        firstName: names[0],
        lastName: names.slice(1).join(" "),
        city: data.city,
        zip: data.postcode,
      });

      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const cardWrap = (field: CardField) =>
    cn(
      "w-full h-11 px-4 rounded-lg border text-base transition-all bg-white flex items-center",
      cardErrors[field]
        ? "border-red-400 ring-2 ring-red-100"
        : cardFocus === field
        ? "border-blue-500 ring-2 ring-blue-100"
        : cardComplete[field] && !cardErrors[field]
        ? "border-emerald-400"
        : "border-gray-300"
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <input type="text" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 h-0 w-0" {...register("_hp")} />

      {/* Personal data */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Datos personales</h3>
        </div>

        <FormInput
          label="Nombre completo"
          placeholder="María García López"
          error={errors.fullName?.message}
          success={inputValid("fullName")}
          register={register("fullName", { required: "Obligatorio", minLength: { value: 2, message: "Mínimo 2 caracteres" } })}
          name="fullName"
          autoComplete="name"
        />

        <FormInput
          label="Email"
          placeholder="maria@email.com"
          error={errors.email?.message}
          success={inputValid("email")}
          register={register("email", { required: "Obligatorio", pattern: { value: EMAIL_RE, message: "Email no válido" } })}
          name="email"
          type="email"
          autoComplete="email"
        />

        <FormInput
          label="Teléfono"
          placeholder="612 345 678"
          error={errors.phone?.message}
          success={inputValid("phone")}
          register={register("phone", { required: "Obligatorio", pattern: { value: PHONE_RE, message: "Teléfono no válido" } })}
          name="phone"
          type="tel"
          autoComplete="tel"
        />

        <FormInput
          label="Dirección"
          placeholder="Calle Mayor 123, 2ºB"
          error={errors.address?.message}
          success={inputValid("address")}
          register={register("address", { required: "Obligatorio", minLength: { value: 5, message: "Demasiado corta" } })}
          name="address"
          autoComplete="street-address"
        />

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Código Postal"
            placeholder="28001"
            error={errors.postcode?.message}
            success={inputValid("postcode")}
            register={register("postcode", { required: "Obligatorio", pattern: { value: POSTCODE_RE, message: "5 dígitos" } })}
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

      {/* Card data */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Datos de la tarjeta</h3>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">Número de tarjeta</label>
            <div className={cardWrap("number")}>
              <CardNumberElement
                options={{ style: STRIPE_STYLE, placeholder: "1234 5678 9012 3456" }}
                onChange={(e) => {
                  setCardComplete((p) => ({ ...p, number: e.complete }));
                  setCardErrors((p) => ({ ...p, number: e.error?.message }));
                }}
                onFocus={() => setCardFocus("number")}
                onBlur={() => setCardFocus(null)}
              />
            </div>
            {cardErrors.number && <p className="text-xs text-red-500 mt-1">{cardErrors.number}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-800 block mb-1.5">Caducidad</label>
              <div className={cardWrap("expiry")}>
                <CardExpiryElement
                  options={{ style: STRIPE_STYLE, placeholder: "MM / YY" }}
                  onChange={(e) => {
                    setCardComplete((p) => ({ ...p, expiry: e.complete }));
                    setCardErrors((p) => ({ ...p, expiry: e.error?.message }));
                  }}
                  onFocus={() => setCardFocus("expiry")}
                  onBlur={() => setCardFocus(null)}
                />
              </div>
              {cardErrors.expiry && <p className="text-xs text-red-500 mt-1">{cardErrors.expiry}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-800 block mb-1.5">CVC</label>
              <div className={cardWrap("cvc")}>
                <CardCvcElement
                  options={{ style: STRIPE_STYLE, placeholder: "123" }}
                  onChange={(e) => {
                    setCardComplete((p) => ({ ...p, cvc: e.complete }));
                    setCardErrors((p) => ({ ...p, cvc: e.error?.message }));
                  }}
                  onFocus={() => setCardFocus("cvc")}
                  onBlur={() => setCardFocus(null)}
                />
              </div>
              {cardErrors.cvc && <p className="text-xs text-red-500 mt-1">{cardErrors.cvc}</p>}
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full h-12 bg-brand hover:bg-brand-hover text-white font-bold text-base shadow-[0_4px_14px_rgba(72,125,38,0.35)]"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando pago...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Confirmar pago
          </>
        )}
      </Button>
    </form>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════ */
/*  COD FORM                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CodForm({
  bundle,
  onSuccess,
  onError,
}: {
  bundle: Bundle;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const { trackPurchase } = useMetaPixel();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm<FormData>({ mode: "onTouched" });

  const watched = watch();

  const inputValid = (field: keyof FormData) =>
    !!touchedFields[field] && !errors[field] && !!watched[field];

  const onSubmit = async (data: FormData) => {
    if (data._hp) return;

    setSubmitting(true);
    onError("");

    try {
      const result = await createOrderAction({
        customerData: {
          fullName: data.fullName,
          phone: data.phone.replace(/[\s\-]/g, ""),
          address: data.address,
          postalCode: data.postcode,
          city: data.city,
          province: data.province,
          email: data.email,
        },
        bundleId: bundle.id,
        paymentMethod: "COD",
      });

      if (!result.success) {
        onError(result.error ?? "Error al crear el pedido.");
        setSubmitting(false);
        return;
      }

      const names = data.fullName.split(" ");
      trackPurchase({
        orderId: result.orderId ?? "cod-unknown",
        orderNumber: result.orderNumber ?? "cod-unknown",
        value: bundle.priceInCents / 100,
        currency: "EUR",
        items: [{ id: bundle.id, name: bundle.name, quantity: 1, price: bundle.priceInCents / 100 }],
        email: data.email || undefined,
        phone: data.phone.replace(/[\s\-]/g, ""),
        firstName: names[0],
        lastName: names.slice(1).join(" "),
        city: data.city,
        zip: data.postcode,
      });

      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <input type="text" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 h-0 w-0" {...register("_hp")} />

      {/* Personal data */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Datos de envío</h3>
        </div>

        <FormInput
          label="Nombre completo"
          placeholder="María García López"
          error={errors.fullName?.message}
          success={inputValid("fullName")}
          register={register("fullName", { required: "Obligatorio", minLength: { value: 2, message: "Mínimo 2 caracteres" } })}
          name="fullName"
          autoComplete="name"
        />

        <FormInput
          label="Email"
          placeholder="maria@email.com"
          error={errors.email?.message}
          success={inputValid("email")}
          register={register("email", { required: "Obligatorio", pattern: { value: EMAIL_RE, message: "Email no válido" } })}
          name="email"
          type="email"
          autoComplete="email"
        />

        <FormInput
          label="Teléfono"
          placeholder="612 345 678"
          error={errors.phone?.message}
          success={inputValid("phone")}
          register={register("phone", { required: "Obligatorio", pattern: { value: PHONE_RE, message: "Teléfono no válido" } })}
          name="phone"
          type="tel"
          autoComplete="tel"
        />

        <FormInput
          label="Dirección"
          placeholder="Calle Mayor 123, 2ºB"
          error={errors.address?.message}
          success={inputValid("address")}
          register={register("address", { required: "Obligatorio", minLength: { value: 5, message: "Demasiado corta" } })}
          name="address"
          autoComplete="street-address"
        />

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Código Postal"
            placeholder="28001"
            error={errors.postcode?.message}
            success={inputValid("postcode")}
            register={register("postcode", { required: "Obligatorio", pattern: { value: POSTCODE_RE, message: "5 dígitos" } })}
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

      {/* COD info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-800">Pago contra rembolso</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          Pagas el importe total al recibir el paquete. El repartidor acepta efectivo o tarjeta.
          Recibirás un SMS con la fecha y franja horaria de entrega.
        </p>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full h-12 bg-brand hover:bg-brand-hover text-white font-bold text-base shadow-[0_4px_14px_rgba(72,125,38,0.35)]"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <Truck className="w-5 h-5 mr-2" />
            Confirmar pedido
          </>
        )}
      </Button>
    </form>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SUCCESS SCREEN                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

function SuccessScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex flex-col items-center text-center py-10 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4"
      >
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </motion.div>
      <h3 className={cn(integralCF.className, "text-xl text-black mb-2")}>
        ¡Pedido confirmado!
      </h3>
      <p className="text-sm text-black/60 max-w-[260px]">
        Hemos recibido tu pedido correctamente. Te enviaremos un email de confirmación en breve.
      </p>
      <p className="text-xs text-black/40 mt-4">Cerrando...</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN MODAL                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const CheckoutModal: React.FC<CheckoutModalProps> = ({ open, onOpenChange, method }) => {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setBundle(getStoredBundle());
      setError(null);
      setSubmitted(false);
    }
  }, [open]);

  const handleSuccess = useCallback(() => setSubmitted(true), []);
  const handleError = useCallback((msg: string) => setError(msg), []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setError(null);
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
          "h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
        )}
      >
        <DialogTitle className="sr-only">
          Checkout — {isCard ? "Pago con tarjeta" : "Contra rembolso"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Completa tu compra de forma segura
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            {isCard ? (
              <CreditCard className="w-5 h-5 text-brand" />
            ) : (
              <Wallet className="w-5 h-5 text-brand" />
            )}
            <span className={cn(integralCF.className, "text-sm text-black")}>
              Checkout — {isCard ? "Tarjeta" : "Contra rembolso"}
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

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {submitted ? (
            <SuccessScreen onClose={handleClose} />
          ) : (
            <div className="p-5 space-y-5">
              {/* Order summary */}
              <InlineOrderSummary bundle={bundle} isCard={isCard} />

              {/* Error */}
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

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={method}
                  initial={{ opacity: 0, x: isCard ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isCard ? -20 : 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {isCard ? (
                    <Elements stripe={stripePromise}>
                      <CardFormInner bundle={bundle} onSuccess={handleSuccess} onError={handleError} />
                    </Elements>
                  ) : (
                    <CodForm bundle={bundle} onSuccess={handleSuccess} onError={handleError} />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Security */}
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold">Pago 100% seguro · SSL encriptado</span>
                </div>
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  Tus datos están protegidos. No compartimos tu información con terceros.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
