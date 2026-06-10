import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { BUNDLES, CARD_DISCOUNT_CENTS } from "@/lib/bundles";
import { paymentIntentRatelimit, getClientIp } from "@/lib/rate-limit";

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
  const { success: allowed, limit, reset, remaining } = await paymentIntentRatelimit.limit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
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

    const amountCents = Math.max(0, bundle.priceInCents - CARD_DISCOUNT_CENTS);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
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
