// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting con Upstash Redis — compatible con arquitectura serverless
// en Vercel (múltiples instancias sin estado compartido).
//
// Requiere variables de entorno:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// ─────────────────────────────────────────────────────────────────────────────

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!hasRedis) {
  console.warn(
    "[rate-limit] Upstash Redis no configurado: rate limiting desactivado. " +
    "Configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en .env.local"
  );
}

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Limiter de no-op cuando Redis no está disponible: siempre permite el paso
const noopLimiter = {
  limit: async (_id: string) => ({
    success: true,
    limit: 0,
    remaining: 0,
    reset: 0,
    pending: Promise.resolve(),
  }),
};

function makeRatelimit<W extends string>(requests: number, window: W) {
  if (!redis) return noopLimiter as unknown as Ratelimit;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      requests,
      window as unknown as Parameters<typeof Ratelimit.slidingWindow>[1]
    ),
    analytics: true,
  });
}

// ─── Instancias pre-configuradas ─────────────────────────────────────────────

/** POST /api/create-payment-intent */
export const paymentIntentRatelimit = makeRatelimit(10, "1 h");

/** POST /api/track */
export const trackRatelimit = makeRatelimit(60, "1 m");

/** submitContactAction */
export const contactRatelimit = makeRatelimit(5, "1 h");

/** createOrderAction (por IP) */
export const orderIpRatelimit = makeRatelimit(5, "1 h");

/** createOrderAction (por teléfono) */
export const orderPhoneRatelimit = makeRatelimit(3, "1 h");

/** GET /api/analytics/live */
export const analyticsRatelimit = makeRatelimit(30, "1 m");

/** POST /api/meta/capi */
export const metaCapiRatelimit = makeRatelimit(100, "1 m");

// ─── Helpers de extracción de IP ─────────────────────────────────────────────

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function getClientIpFromHeaders(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

// ─── Helper genérico para construir respuestas 429 ───────────────────────────

export function rateLimitResponse(
  remaining: number,
  reset: number
): { status: 429; headers: Record<string, string>; body: Record<string, unknown> } {
  return {
    status: 429,
    headers: {
      "X-RateLimit-Remaining": String(remaining),
      "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
    },
    body: { error: "Demasiados intentos. Inténtalo más tarde." },
  };
}
