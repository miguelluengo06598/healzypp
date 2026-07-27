// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/orders/[id]
// Detalle de UN pedido — a diferencia de /api/dashboard/stats, esta respuesta
// SÍ incluye datos personales del cliente final (nombre, email, teléfono,
// dirección de envío): es la excepción explícita del diseño para poder
// gestionar un pedido concreto desde el dashboard SaaS. Ese dashboard tiene
// prohibido cachear o persistir esta respuesta — aquí solo controlamos que
// nadie la reciba sin el token, y que un intermediario HTTP no la cachee.
//
// Protegido por el mismo Authorization: Bearer <DASHBOARD_API_TOKEN> que
// /api/dashboard/stats — ver src/lib/dashboard-api-auth.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { authenticateDashboardRequest, hashToken } from '@/lib/dashboard-api-auth'
import { orderDetailRatelimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateDashboardRequest(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 })
  }

  // Dedicado y más estricto que el límite general de dashboard/* (ver
  // orderDetailRatelimit en lib/rate-limit.ts) — este es el único endpoint
  // de dashboard/* con PII, así que un barrido de IDs de pedido con un
  // token válido merece un techo propio, no el compartido con /stats.
  // authenticateDashboardRequest() ya validó el token arriba, así que
  // volver a leerlo aquí es seguro (mismo header, ya comprobado).
  const authHeader = req.headers.get('authorization') ?? ''
  const [, token] = authHeader.split(' ')
  const tokenHash = hashToken(token ?? '')

  const { success, remaining, reset } = await orderDetailRatelimit.limit(tokenHash)
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'Retry-After': String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
        },
      }
    )
  }

  try {
    const supabase = createServiceClient()

    const [{ data: order, error: orderError }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase
          .from('orders')
          .select(
            'id, numero_pedido, email_cliente, nombre_cliente, telefono_cliente, estado, subtotal, descuento, gastos_envio, total, metodo_pago, direccion_envio, notas_cliente, fecha_creacion, fecha_actualizacion'
          )
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('order_items')
          .select('id, product_id, nombre_producto, cantidad, precio_unitario, precio_total')
          .eq('order_id', id)
          .order('id', { ascending: true }),
      ])

    if (orderError) throw orderError
    if (itemsError) throw itemsError

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    // Log de auditoría — SOLO metadatos (qué token, qué pedido, cuándo),
    // nunca el contenido del pedido (nombre/email/teléfono/dirección van en
    // `order`, no en esta línea). token_hash, no el token en claro, mismo
    // criterio que el rate limit de arriba.
    console.log(
      '[audit] order_detail_access',
      JSON.stringify({ token_hash: tokenHash, order_id: id, at: new Date().toISOString() })
    )

    return NextResponse.json(
      { ...order, items: items ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[dashboard/orders/[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
