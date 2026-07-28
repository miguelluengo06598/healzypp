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
        // FAIL-OPEN INTENCIONAL: si Redis no está disponible, dejamos pasar
        // la petición en lugar de devolver 429 o 500. La disponibilidad del
        // checkout tiene prioridad sobre el rate limiting. Si Upstash tiene un
        // outage, los endpoints siguen funcionando; los abusos en ese período
        // son un riesgo aceptado. NO "arreglar" esto devolviendo success:false.
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

// ─── Limiter estricto: Redis con respaldo EN MEMORIA ─────────────────────────
//
// makeRatelimit() de arriba falla ABIERTO a propósito: para el checkout, la
// disponibilidad manda sobre el límite. Para un endpoint de CONSULTA que es
// blanco natural de fuerza bruta (probar números de pedido y emails ajenos),
// esa decisión se invierte: si Redis cae, dejarlo pasar todo convierte el
// endpoint en un oráculo sin límite.
//
// Tampoco vale fallar cerrado del todo (un outage de Upstash dejaría a los
// clientes sin poder consultar su pedido). El punto medio es un contador en
// memoria del proceso: no es distribuido —en serverless cada instancia lleva
// el suyo— pero corta en seco a un atacante que machaca desde una IP, que es
// justo el caso que importa.

interface MemoryBucket {
  count: number
  resetAt: number
}
const memoryBuckets = new Map<string, MemoryBucket>()

function memoryLimit(id: string, requests: number, windowMs: number) {
  const now = Date.now()

  // Limpieza perezosa: evita que el Map crezca sin límite con IPs que ya
  // caducaron. Barato porque solo corre cuando se usa el respaldo.
  if (memoryBuckets.size > 5000) {
    for (const [k, v] of memoryBuckets) {
      if (v.resetAt <= now) memoryBuckets.delete(k)
    }
  }

  const bucket = memoryBuckets.get(id)
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(id, { count: 1, resetAt: now + windowMs })
    return { success: true, limit: requests, remaining: requests - 1, reset: now + windowMs }
  }

  bucket.count += 1
  const remaining = Math.max(0, requests - bucket.count)
  return {
    success: bucket.count <= requests,
    limit: requests,
    remaining,
    reset: bucket.resetAt,
  }
}

function makeStrictRatelimit(requests: number, window: string, windowMs: number) {
  const rl = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(
          requests,
          window as Parameters<typeof Ratelimit.fixedWindow>[1]
        ),
        analytics: false,
      })
    : null

  return {
    limit: async (id: string) => {
      if (rl) {
        try {
          return await rl.limit(id)
        } catch (err) {
          console.error(
            "[ratelimit:strict] Redis error — usando contador en memoria:",
            err instanceof Error ? err.message : String(err)
          )
        }
      }
      return memoryLimit(id, requests, windowMs)
    },
  }
}

// ─── Instancias pre-configuradas ─────────────────────────────────────────────

/** POST /api/create-payment-intent y /api/checkout/create-payment-intent */
export const paymentIntentRatelimit = makeRatelimit(10, "1 h");

/** POST /api/checkout/validate-coupon */
export const couponRatelimit = makeRatelimit(15, "1 h");

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

/** GET /api/dashboard/stats y el resto de dashboard/* (salvo orders/[id], que tiene el suyo abajo) — por token, no por IP */
export const dashboardApiRatelimit = makeRatelimit(60, "1 m");

/**
 * GET /api/dashboard/orders/[id] — dedicado y más estricto que el general de
 * arriba: esta es la única respuesta de dashboard/* con PII (nombre, email,
 * teléfono, dirección de un cliente final), así que un límite compartido con
 * el resto de endpoints (solo cifras agregadas) no reflejaba el riesgo
 * distinto. 30/min por token es de sobra para uso normal (un humano abriendo
 * pedidos uno a uno desde el dashboard) y corta un barrido rápido de IDs de
 * pedido con un token válido.
 */
export const orderDetailRatelimit = makeRatelimit(30, "1 m");

/**
 * POST /api/seguimiento — consulta pública de un pedido por número + email.
 *
 * Estricto (5/hora por IP) y con respaldo en memoria si Redis cae: es el único
 * endpoint sin autenticar que devuelve datos de un pedido concreto, así que un
 * atacante podría intentar adivinar combinaciones de número y email. Un
 * cliente legítimo consulta su pedido un par de veces; 5 por hora le sobra.
 */
export const seguimientoRatelimit = makeStrictRatelimit(5, "1 h", 60 * 60 * 1000);

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
