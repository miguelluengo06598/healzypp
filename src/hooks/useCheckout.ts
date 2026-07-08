"use client"

import { useState, useEffect } from "react"

export type CheckoutContact = {
  email: string
  firstName: string
  lastName: string
  saveInfo: boolean
}

export type ShippingAddress = {
  firstName: string
  lastName: string
  phone: string
  address: string
  apartment: string
  postalCode: string
  city: string
  province: string
  country: string
}

export type ShippingMethod = {
  id: string
  name: string
  description: string
  estimatedDays: string
  price: number  // euros
}

export type CouponState = {
  code: string
  discount: number  // euros
  type: "fixed" | "percentage"
  percentageOff?: number
}

export type CheckoutStep = 1 | 2 | 3 | 4

const STORAGE_KEY = "healzyp_checkout"

type PersistedCheckout = {
  contact: CheckoutContact | null
  shippingAddress: ShippingAddress | null
  shippingMethod: ShippingMethod | null
}

export function useCheckout() {
  const [step, setStep] = useState<CheckoutStep>(1)
  const [contact, setContact] = useState<CheckoutContact | null>(null)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | null>(null)
  const [coupon, setCoupon] = useState<CouponState | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as PersistedCheckout
        if (saved.contact) {
          setContact(saved.contact)
          setStep(2)
        }
        if (saved.shippingAddress) {
          setShippingAddress(saved.shippingAddress)
          setStep(3)
        }
        if (saved.shippingMethod) {
          setShippingMethod(saved.shippingMethod)
          setStep(4)
        }
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const toSave: PersistedCheckout = { contact, shippingAddress, shippingMethod }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {}
  }, [contact, shippingAddress, shippingMethod, hydrated])

  const handleContactComplete = (data: CheckoutContact) => {
    setContact(data)
    setStep(2)
  }

  const handleAddressComplete = (data: ShippingAddress) => {
    setShippingAddress(data)
    setStep(3)
  }

  const handleShippingComplete = (method: ShippingMethod) => {
    setShippingMethod(method)
    setStep(4)
  }

  const clearCheckout = () => {
    setContact(null)
    setShippingAddress(null)
    setShippingMethod(null)
    setCoupon(null)
    setStep(1)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  return {
    step,
    setStep,
    contact,
    setContact,
    handleContactComplete,
    shippingAddress,
    setShippingAddress,
    handleAddressComplete,
    shippingMethod,
    setShippingMethod,
    handleShippingComplete,
    coupon,
    setCoupon,
    hydrated,
    clearCheckout,
  }
}
