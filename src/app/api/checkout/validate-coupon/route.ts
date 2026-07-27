import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase"
import { couponRatelimit, getClientIp } from "@/lib/rate-limit"
import { isTrustedOrigin } from "@/lib/security/origin-check"

const BodySchema = z.object({
  code: z.string().min(1).max(50).trim().toUpperCase(),
  subtotalEur: z.number().min(0),
})

// Coupon row type — columnas reales de la tabla coupons (database/SETUP-COMPLETO.sql),
// en español. La versión anterior de este archivo usaba nombres en inglés
// (code/active/type "fixed"/"percentage"/expires_at/max_uses/...) que nunca
// existieron en la tabla real — la consulta fallaba siempre y el cupón se
// rechazaba en silencio ("Cupón no válido" para cualquier código).
interface CouponRow {
  id: string
  codigo: string
  tipo: "porcentaje" | "fijo" | "envio_gratis"
  valor: number
  usos_totales: number | null
  usos_actuales: number
  fecha_fin: string | null
  activo: boolean
  minimo_pedido: number | null
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
    .eq("codigo", code)
    .eq("activo", true)
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
  if (coupon.fecha_fin && new Date(coupon.fecha_fin) < new Date()) {
    return NextResponse.json({ error: "Este cupón ha caducado." }, { status: 400 })
  }

  // Check max uses
  if (coupon.usos_totales !== null && coupon.usos_actuales >= coupon.usos_totales) {
    return NextResponse.json({ error: "Este cupón ya no tiene usos disponibles." }, { status: 400 })
  }

  // Check minimum order
  if (coupon.minimo_pedido && subtotalEur < coupon.minimo_pedido) {
    return NextResponse.json(
      { error: `Este cupón requiere un pedido mínimo de ${coupon.minimo_pedido.toFixed(2).replace(".", ",")}€.` },
      { status: 400 }
    )
  }

  // Calculate discount
  let discountEur = 0
  if (coupon.tipo === "fijo") {
    discountEur = Math.min(coupon.valor, subtotalEur)
  } else if (coupon.tipo === "porcentaje") {
    discountEur = Math.round((subtotalEur * coupon.valor) / 100 * 100) / 100
  }
  // 'envio_gratis' no descuenta el subtotal — afecta al coste de envío, que
  // hoy solo se calcula por importe mínimo (FREE_SHIPPING_THRESHOLD_EUR en
  // create-payment-intent/route.ts). Integrar envio_gratis con ese cálculo
  // es una mejora aparte, fuera del alcance de este fix de columnas.

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    type: coupon.tipo,
    percentageOff: coupon.tipo === "porcentaje" ? coupon.valor : undefined,
    discountEur,
    message: coupon.tipo === "envio_gratis"
      ? "Cupón aplicado: envío gratis"
      : `Cupón aplicado: -${discountEur.toFixed(2).replace(".", ",")}€`,
  })
}
