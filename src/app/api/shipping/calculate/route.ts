import { NextRequest, NextResponse } from "next/server"
import { SHIPPING_OPTIONS, FREE_SHIPPING_THRESHOLD_EUR } from "@/lib/shipping"

export async function GET(req: NextRequest) {
  const subtotalStr = req.nextUrl.searchParams.get("subtotal")
  const subtotalEur = subtotalStr ? parseFloat(subtotalStr) : 0

  const options = SHIPPING_OPTIONS.map((o) => ({
    id: o.id,
    name: o.name,
    description: o.description,
    estimatedDays: o.estimatedDays,
    price:
      o.id === "standard" && subtotalEur >= FREE_SHIPPING_THRESHOLD_EUR
        ? 0
        : o.basePrice,
    isFree:
      o.id === "standard" && subtotalEur >= FREE_SHIPPING_THRESHOLD_EUR,
  }))

  return NextResponse.json({ options })
}
