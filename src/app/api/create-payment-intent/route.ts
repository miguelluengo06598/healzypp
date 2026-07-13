import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { BUNDLES } from "@/lib/bundles";
import { paymentIntentRatelimit, getClientIp } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// Esquema de validación — bundleId debe ser entero 1-3
const BodySchema = z.object({
  bundleId: z.number().int().min(1).max(3),
});

export async function POST(req: NextRequest) {
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
    // ── Validar bundle en servidor — nunca confiar en el cliente para el importe
    const bundle = BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) {
      return NextResponse.json({ error: "Bundle no válido." }, { status: 400 });
    }

    // ── Verificar precio real en Supabase antes de cobrar — el precio del mock
    //    (BUNDLES) es solo lo que ve el cliente; el importe que se cobra sale
    //    siempre de la fuente de verdad (bundles.precio), nunca del frontend ──
    let db: ReturnType<typeof createServiceClient>;
    try {
      db = createServiceClient();
    } catch (e) {
      console.error("[create-payment-intent] Supabase no inicializado:", e);
      return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }

    const { data: bundleRow, error: bundleError } = await db
      .from("bundles")
      .select("id, product_id, cantidad, precio, activo")
      .eq("cantidad", bundleId)
      .eq("activo", true)
      .maybeSingle();

    if (bundleError) {
      console.error("[create-payment-intent] error consultando bundle:", bundleError.message);
      return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }

    if (!bundleRow) {
      return NextResponse.json(
        { error: "El bundle solicitado no está disponible actualmente." },
        { status: 400 }
      );
    }

    const { data: productRow, error: productError } = await db
      .from("products")
      .select("id, precio, activo")
      .eq("id", bundleRow.product_id)
      .eq("activo", true)
      .maybeSingle();

    if (productError) {
      console.error("[create-payment-intent] error consultando producto:", productError.message);
      return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }

    if (!productRow) {
      return NextResponse.json(
        { error: "El producto asociado al bundle no está disponible." },
        { status: 400 }
      );
    }

    const realPriceCents = Math.round(Number(bundleRow.precio) * 100);
    if (realPriceCents !== bundle.priceInCents) {
      console.error(
        `[create-payment-intent] precio no coincide — mock: ${bundle.priceInCents}c, Supabase: ${realPriceCents}c (bundleId=${bundleId})`
      );
      return NextResponse.json(
        { error: "El precio del bundle no coincide con el precio real. Pago rechazado." },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: realPriceCents,
      currency: "eur",
      capture_method: "automatic",
      metadata: { bundleId: String(bundleId), bundleName: bundle.name },
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
