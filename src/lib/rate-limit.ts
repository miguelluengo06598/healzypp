// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting con Upstash Redis — compatible con arquitectura serverless.
//
// Requiere variables de entorno:
//   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
//   UPSTASH_REDIS_REST_TOKEN=AXxxxx...
//
// Si Redis falla (p. ej. NOPERM, red, timeout) la llamada a .limit() devuelve
// success:true y loggea el error — el checkout nunca se rompe por Redis.
// ─────────────────────────────────────────────────────────────────────────────

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

// ─── Validación de variables de entorno ──────────────────────────────────────

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error(
    "[rate-limit] ⚠️  UPSTASH_REDIS_REST_URL o UPSTASH_REDIS_REST_TOKEN no están configuradas. " +
    "El rate limiting está DESACTIVADO. Añádelas a .env.local:\n" +
    "  UPSTASH_REDIS_REST_URL=https://xxx.upstash.io\n" +
    "  UPSTASH_REDIS_REST_TOKEN=AXxxxx..."
  );
}

// ─── Cliente Redis ────────────────────────────────────────────────────────────

const redis = REDIS_URL && REDIS_TOKEN
  ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
  : null;

// ─── No-op limiter cuando Redis no está disponible ───────────────────────────

const noopLimiter = {
  limit: async (_id: string) => ({
    success: true as const,
    limit: 0,
    remaining: 0,
    reset: 0,
    pending: Promise.resolve(),
  }),
};

// ─── Factory: crea un limiter con fixedWindow y try/catch incorporado ─────────
//
// fixedWindow no usa scripts Lua (EVALSHA), por lo que es compatible con
// cualquier plan de Upstash, incluidos los que tienen NOPERM para evalsha.
// analytics: false evita llamadas extra a Redis.

function makeRatelimit(requests: number, window: string) {
  if (!redis) return noopLimiter as unknown as Ratelimit;

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(
      requests,
      window as Parameters<typeof Ratelimit.fixedWindow>[1]
    ),
    analytics: false,
  });

  // Envuelve limit() para que un fallo de Redis nunca rompa el servidor.
  // Si Redis lanza (NOPERM, timeout, red), dejamos pasar la petición y loggeamos.
  return {
    limit: async (id: string) => {
      try {
        return await rl.limit(id);
      } catch (err) {
        console.error(
          "[ratelimit] Redis error — permitiendo petición:",
          err instanceof Error ? err.message : String(err)
        );
        return {
          success: true as const,
          limit: requests,
          remaining: requests,
          reset: 0,
          pending: Promise.resolve(),
        };
      }
    },
  } as unknown as Ratelimit;
}

// ─── Instancias pre-configuradas ─────────────────────────────────────────────

/** POST /api/create-payment-intent y /api/checkout/create-payment-intent */
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
    body: { error: "Demasiados intentos. Espera un momento." },
  };
}
