import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { findBundleByIdAcrossCatalog } from "@/data/catalog";
import { paymentIntentRatelimit, getClientIp } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security/origin-check";
import { createServiceClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// Esquema de validación — bundleId debe ser entero 1-3
const BodySchema = z.object({
  bundleId: z.number().int().min(1).max(3),
});

export async function POST(req: NextRequest) {
  // ── CSRF: rechazar peticiones que no vengan del propio origen ───────────────
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  // ── Rate limiting: 10 intentos por IP por hora (Upstash Redis) ──────────────
  const ip = getClientIp(req);

  let allowed = true;
  let remaining = 0;
  try {
    const result = await paymentIntentRatelimit.limit(ip);
    allowed = result.success;
    remaining = result.remaining;
  } catch (err) {
    console.error("[ratelimit] Redis error, skipping:", err);
    allowed = true;
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
    );
  }

  // ── Validación del body con Zod ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { bundleId } = parsed.data;

  try {
    // ── Resolver bundle/producto — 100% desde el catálogo en código
    //    (src/data/catalog.ts), la ÚNICA fuente de precio: se usa el mismo
    //    valor para mostrar (UI) y para cobrar (aquí). Nunca hay dos precios
    //    que puedan divergir, a diferencia del diseño anterior (mock +
    //    verificación en Supabase con comprobación de igualdad).
    const resolved = findBundleByIdAcrossCatalog(bundleId);
    if (!resolved) {
      return NextResponse.json({ error: "Bundle no válido." }, { status: 400 });
    }
    const { product, bundle } = resolved;

    // ── Comprobación de stock — el ÚNICO dato de catálogo que sigue en
    //    Supabase (product_stock, por slug), porque es estado mutable real,
    //    no contenido editorial. El decremento real solo ocurre de forma
    //    atómica en el webhook cuando se confirma el pago.
    let db: ReturnType<typeof createServiceClient>;
    try {
      db = createServiceClient();
    } catch (e) {
      console.error("[create-payment-intent] Supabase no inicializado:", e);
      return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }

    const { data: stockRow, error: stockError } = await db
      .from("product_stock")
      .select("stock")
      .eq("product_slug", product.slug)
      .maybeSingle();

    if (stockError) {
      console.error("[create-payment-intent] error consultando stock:", stockError.message);
      return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }

    const stockDisponible = stockRow?.stock ?? 0;
    if (stockDisponible < bundle.cantidad) {
      return NextResponse.json(
        { error: "No hay stock suficiente para este bundle." },
        { status: 400 }
      );
    }

    const realPriceCents = Math.round(bundle.precio * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: realPriceCents,
      currency: "eur",
      capture_method: "automatic",
      metadata: { bundleId: String(bundleId), bundleName: bundle.nombre, productSlug: product.slug },
    });

    return NextResponse.json(
      { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (err) {
    console.error("[create-payment-intent]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
