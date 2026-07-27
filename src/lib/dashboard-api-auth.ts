// ─────────────────────────────────────────────────────────────────────────────
// Autenticación por token para /api/dashboard/* — el dashboard SaaS externo
// (no un usuario admin con sesión) es quien llama a estos endpoints, así que
// no puede usar auth.getUser()/cookies como el resto del panel de admin.
//
// El token vive en DASHBOARD_API_TOKEN (.env.local), único por instalación —
// se genera una vez al configurar la tienda con:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// y se pega tanto aquí como en "Conectar tienda nueva" del dashboard SaaS.
// Rotar el token es solo cambiar esta variable y desplegar de nuevo.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { dashboardApiRatelimit } from '@/lib/rate-limit'

// Comparación en tiempo constante — evita que un atacante deduzca el token
// byte a byte midiendo cuánto tarda en fallar la comparación (timing attack).
// Si las longitudes difieren, igual ejecutamos timingSafeEqual contra sí
// mismo para que el camino de fallo tarde lo mismo que el de éxito.
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

// Extraído para que otras rutas (orders/[id], para su rate limit dedicado y
// su log de auditoría) puedan derivar el mismo hash sin repetir la llamada a
// createHash — nunca el token en claro fuera de esta función.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type DashboardAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

export async function authenticateDashboardRequest(
  req: NextRequest
): Promise<DashboardAuthResult> {
  const expected = process.env.DASHBOARD_API_TOKEN

  if (!expected) {
    console.error('[dashboard-api] DASHBOARD_API_TOKEN no está configurado en .env.local')
    return {
      ok: false,
      response: NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 }),
    }
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token || !safeCompare(token, expected)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  // Rate limit por token (hasheado — nunca guardamos el token en claro en
  // Redis ni en logs), no por IP: si el token se filtra, el límite sigue
  // aplicando aunque el abuso venga repartido entre varias IPs.
  const tokenHash = hashToken(token)
  const { success, remaining, reset } = await dashboardApiRatelimit.limit(tokenHash)

  if (!success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Demasiadas peticiones' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(remaining),
            'Retry-After': String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
          },
        }
      ),
    }
  }

  return { ok: true }
}
