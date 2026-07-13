import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase"
import { couponRatelimit, getClientIp } from "@/lib/rate-limit"
import { isTrustedOrigin } from "@/lib/security/origin-check"

const BodySchema = z.object({
  code: z.string().min(1).max(50).trim().toUpperCase(),
  subtotalEur: z.number().min(0),
})

// Coupon row type — table needs to exist in Supabase
interface CouponRow {
  id: number
  code: string
  type: "fixed" | "percentage"
  value: number
  max_uses: number | null
  current_uses: number
  expires_at: string | null
  active: boolean
  minimum_order_eur: number | null
}

export async function POST(req: NextRequest) {
  // ── CSRF: rechazar peticiones que no vengan del propio origen ───────────────
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 })
  }

  // ── Rate limiting: previene fuerza bruta de códigos de cupón ────────────────
  const ip = getClientIp(req)

  let allowed = true
  let remaining = 0
  try {
    const result = await couponRatelimit.limit(ip)
    allowed = result.success
    remaining = result.remaining
  } catch (err) {
    console.error("[ratelimit] Redis error, skipping:", err)
    allowed = true
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(3600),
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 })
  }

  const { code, subtotalEur } = parsed.data

  let db: ReturnType<typeof createServiceClient>
  try {
    db = createServiceClient()
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 })
  }

  const { data, error } = await (db as any)
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle()

  if (error) {
    // Table may not exist yet
    console.warn("[validate-coupon] coupons table error:", error.message)
    return NextResponse.json({ error: "Cupón no válido." }, { status: 404 })
  }

  if (!data) {
    return NextResponse.json({ error: "Cupón no encontrado." }, { status: 404 })
  }

  const coupon = data as CouponRow

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "Este cupón ha caducado." }, { status: 400 })
  }

  // Check max uses
  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    return NextResponse.json({ error: "Este cupón ya no tiene usos disponibles." }, { status: 400 })
  }

  // Check minimum order
  if (coupon.minimum_order_eur !== null && subtotalEur < coupon.minimum_order_eur) {
    return NextResponse.json(
      { error: `Este cupón requiere un pedido mínimo de ${coupon.minimum_order_eur.toFixed(2).replace(".", ",")}€.` },
      { status: 400 }
    )
  }

  // Calculate discount
  let discountEur = 0
  if (coupon.type === "fixed") {
    discountEur = Math.min(coupon.value, subtotalEur)
  } else {
    discountEur = Math.round((subtotalEur * coupon.value) / 100 * 100) / 100
  }

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    type: coupon.type,
    percentageOff: coupon.type === "percentage" ? coupon.value : undefined,
    discountEur,
    message: `Cupón aplicado: -${discountEur.toFixed(2).replace(".", ",")}€`,
  })
}
