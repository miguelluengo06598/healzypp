"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Elements } from "@stripe/react-stripe-js"
import { useAppSelector, useAppDispatch } from "@/lib/hooks/redux"
import { clearCart } from "@/lib/features/carts/cartsSlice"
import { RootState } from "@/lib/store"
import { stripePromise } from "@/lib/stripe"
import { integralCF } from "@/styles/fonts"
import { cn } from "@/lib/utils"
import { FaLock } from "react-icons/fa"
import { useCheckout } from "@/hooks/useCheckout"

import ContactSection from "@/components/checkout/ContactSection"
import ShippingAddressSection from "@/components/checkout/ShippingAddressSection"
import ShippingMethodSection from "@/components/checkout/ShippingMethodSection"
import PaymentSection from "@/components/checkout/PaymentSection"
import CartOrderSummary from "@/components/checkout/CartOrderSummary"

export default function CheckoutPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { cart, adjustedTotalPrice } = useAppSelector((state: RootState) => state.carts)
  const checkout = useCheckout()

  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Redirect to shop if cart is empty
  useEffect(() => {
    if (checkout.hydrated && (!cart || cart.items.length === 0)) {
      router.replace("/shop")
    }
  }, [cart, checkout.hydrated, router])

  if (!checkout.hydrated || !cart || cart.items.length === 0) {
    return null
  }

  const shippingCostEur = checkout.shippingMethod?.price ?? 0
  const couponDiscountEur = checkout.coupon?.discount ?? 0
  const totalEur = Math.max(0, adjustedTotalPrice - couponDiscountEur + shippingCostEur)

  // Called by PaymentSection after Stripe creates the PaymentMethod
  const handlePaymentSubmit = async (paymentMethodId: string) => {
    // Surface Stripe PM errors (prefixed with __error__)
    if (paymentMethodId.startsWith("__error__:")) {
      setPaymentError(paymentMethodId.slice(10))
      return
    }

    if (!checkout.contact || !checkout.shippingAddress || !checkout.shippingMethod) {
      setPaymentError("Faltan datos del pedido. Revisa los pasos anteriores.")
      return
    }

    setPaymentLoading(true)
    setPaymentError(null)

    try {
      // Create order + PaymentIntent on server
      const piRes = await fetch("/api/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            attributes: item.attributes,
          })),
          shippingAddress: checkout.shippingAddress,
          shippingMethodId: checkout.shippingMethod.id,
          email: checkout.contact.email,
          couponCode: checkout.coupon?.code,
          couponDiscountEur: checkout.coupon?.discount ?? 0,
        }),
      })

      const piData = await piRes.json()

      if (!piRes.ok || !piData.clientSecret) {
        setPaymentError(piData.error ?? "Error al iniciar el pago.")
        return
      }

      // Confirm payment with Stripe
      const stripe = await stripePromise
      if (!stripe) {
        setPaymentError("El sistema de pago no está disponible. Recarga la página.")
        return
      }

      const { error: confirmError } = await stripe.confirmCardPayment(piData.clientSecret, {
        payment_method: paymentMethodId,
      })

      if (confirmError) {
        setPaymentError(confirmError.message ?? "El pago fue rechazado.")
        return
      }

      // Store order summary for confirmation page
      try {
        sessionStorage.setItem(
          "healzyp_order",
          JSON.stringify({
            orderNumber: piData.orderNumber,
            email: checkout.contact.email,
            firstName: checkout.contact.firstName,
            items: cart.items.map((item) => ({
              name: item.name,
              srcUrl: item.srcUrl,
              quantity: item.quantity,
              attributes: item.attributes,
              price: item.price,
              discount: item.discount,
            })),
            shippingAddress: checkout.shippingAddress,
            shippingMethod: checkout.shippingMethod,
            subtotalEur: adjustedTotalPrice,
            shippingCostEur: checkout.shippingMethod.price,
            couponDiscountEur,
            totalEur: piData.totalEur,
          })
        )
      } catch {}

      // Clear cart + checkout state
      dispatch(clearCart())
      checkout.clearCheckout()

      router.push("/order/confirmation")
    } catch {
      setPaymentError("Error de red. Comprueba tu conexión e inténtalo de nuevo.")
    } finally {
      setPaymentLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Minimal header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/cart" className="text-sm text-black/40 hover:text-black transition-colors">
            ← Carrito
          </Link>
          <Link href="/">
            <span className={cn(integralCF.className, "text-xl md:text-2xl font-bold")}>
              HEALZYP
            </span>
          </Link>
          <p className="hidden sm:flex items-center gap-1.5 text-xs text-black/40">
            <FaLock className="text-[10px] text-[#487D26]" />
            Pago seguro · SSL
          </p>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Mobile: collapsible summary at top */}
        <div className="lg:hidden mb-6">
          <CartOrderSummary
            items={cart.items}
            subtotalEur={adjustedTotalPrice}
            shippingMethod={checkout.shippingMethod}
            coupon={checkout.coupon}
            onCouponChange={checkout.setCoupon}
            collapsible
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* ── Left: form sections ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Step 1: Contact */}
            <ContactSection
              defaultValues={checkout.contact}
              onComplete={checkout.handleContactComplete}
              isCompleted={checkout.step > 1}
              onEdit={() => checkout.setStep(1)}
            />

            {/* Step 2: Shipping address */}
            {checkout.step >= 2 && (
              <ShippingAddressSection
                defaultValues={checkout.shippingAddress}
                onComplete={checkout.handleAddressComplete}
                isCompleted={checkout.step > 2}
                onEdit={() => checkout.setStep(2)}
              />
            )}

            {/* Step 3: Shipping method */}
            {checkout.step >= 3 && (
              <ShippingMethodSection
                subtotalEur={adjustedTotalPrice}
                selected={checkout.shippingMethod}
                onSelect={checkout.setShippingMethod}
                onComplete={checkout.handleShippingComplete}
                isCompleted={checkout.step > 3}
                onEdit={() => checkout.setStep(3)}
              />
            )}

            {/* Step 4: Payment */}
            {checkout.step >= 4 && (
              stripePromise ? (
                <Elements stripe={stripePromise}>
                  <PaymentSection
                    totalEur={totalEur}
                    loading={paymentLoading}
                    error={paymentError}
                    onSubmit={handlePaymentSubmit}
                  />
                </Elements>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-sm text-yellow-800">
                  <strong>Configuración pendiente:</strong> añade{" "}
                  <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> a tu{" "}
                  <code>.env.local</code> para activar el pago.
                </div>
              )
            )}
          </div>

          {/* ── Right: sticky order summary ─────────────────────────────────────── */}
          <div className="hidden lg:block sticky top-[73px]">
            <CartOrderSummary
              items={cart.items}
              subtotalEur={adjustedTotalPrice}
              shippingMethod={checkout.shippingMethod}
              coupon={checkout.coupon}
              onCouponChange={checkout.setCoupon}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
