import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateOrderPaymentStatus, getOrderByStripePaymentIntentId, decrementProductStock } from "@/lib/db/orders";
import { createServiceClient } from "@/lib/supabase";
import { sendOrderNotification } from "@/lib/notifications";
import { sendPushover } from "@/lib/notifications/pushover";
import { sendPurchaseCAPI } from "@/lib/meta/capi";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

function getCityFromOrder(order: any): string {
  if (!order) return "";
  if (order.city) return order.city;
  if (order.shipping_city) return order.shipping_city;
  if (typeof order.direccion_envio === "string") return order.direccion_envio;
  if (order.direccion_envio?.ciudad) return order.direccion_envio.ciudad;
  return "";
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[stripe-webhook] Falta stripe-signature o STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Configuración incorrecta." }, { status: 400 });
  }

  // Leer el body como ArrayBuffer → Buffer para stripe.webhooks.constructEvent
  const buf = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    // Firma inválida — posible request falsa
    console.error("[stripe-webhook] Firma inválida:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Firma no válida." }, { status: 400 });
  }

  // ── Procesar el evento ──────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;

        // ── Idempotencia: Stripe puede reenviar el mismo evento (redelivery).
        //    Si el pedido ya está 'pagado', no repetir notificaciones ni el
        //    decremento de stock — solo confirmar recepción a Stripe.
        const existingOrder = await getOrderByStripePaymentIntentId(pi.id);
        if (existingOrder?.estado === "pagado") {
          console.log("[stripe-webhook] Redelivery ignorado, pedido ya pagado:", pi.id);
          break;
        }

        await updateOrderPaymentStatus(pi.id, "PAID");
        console.log("[stripe-webhook] Pago confirmado:", pi.id);

        // Notificación ntfy — buscamos la orden completa para el total
        const order = await getOrderByStripePaymentIntentId(pi.id);

        // ── Decremento atómico de stock — solo aquí, tras confirmarse el pago ──
        if (order?.order_items?.length) {
          const stockByProduct = new Map<string, number>();
          for (const item of order.order_items) {
            if (!item.product_id || !item.unidades_stock) continue;
            stockByProduct.set(
              item.product_id,
              (stockByProduct.get(item.product_id) ?? 0) + item.unidades_stock
            );
          }
          for (const [productId, qty] of stockByProduct) {
            const decremented = await decrementProductStock(productId, qty);
            if (!decremented) {
              console.error(
                `[stripe-webhook] Stock insuficiente al decrementar producto ${productId} (qty=${qty}) para el pedido ${order.numero_pedido} — venta ya cobrada, requiere revisión manual.`
              );
              sendPushover({
                title: "⚠️ Posible sobreventa de stock",
                message:
                  `Pedido #${order.numero_pedido} ya cobrado, pero el stock del producto ${productId} ` +
                  `no alcanzaba para descontar ${qty} unidades. Revisar inventario manualmente.`,
                priority: 1,
                sound: "falling",
              }).catch((e) => console.error("[stripe-webhook] Pushover sobreventa error:", e));
            }
          }
        }
        sendOrderNotification({
          orderNumber:      order?.numero_pedido ?? pi.id,
          totalEuros:       order ? Number(order.total) : pi.amount / 100,
          status:           "confirmed",
          paymentIntentId:  pi.id,
        }).catch((e) => console.error("[stripe-webhook] ntfy CONFIRMED error:", e));

        // Pushover — consulta explícita a Supabase tras actualizar el pedido
        {
          const db = createServiceClient();
          const { data: so } = await db
            .from("orders")
            .select("id, numero_pedido, nombre_cliente, total, direccion_envio")
            .eq("stripe_payment_intent_id", pi.id)
            .single();

          console.log('[Webhook] Orden encontrada para Pushover:', !!so, 'PI:', pi.id);

          if (so) {
            console.log('[Webhook] Intentando enviar Pushover...');
            const direccion =
              typeof so.direccion_envio === "object"
                ? (so.direccion_envio as any)?.ciudad ?? ""
                : String(so.direccion_envio ?? "");

            sendPushover({
              title: "💳 Pago con tarjeta recibido",
              message:
                `👤 ${so.nombre_cliente ?? "Desconocido"}\n` +
                `📦 Pedido: #${so.numero_pedido ?? pi.id}\n` +
                `💰 Total: ${Number(so.total ?? pi.amount / 100).toFixed(2)}€\n` +
                `📍 ${direccion}\n` +
                `✅ Pago confirmado por Stripe`,
              priority: 1,
              sound: "cashregister",
              url: `https://healzyp.com/admin/orders/${so.id}`,
              url_title: "Ver pedido",
            }).catch((e) => console.error("[stripe-webhook] Pushover CONFIRMED error:", e));

            // Meta CAPI Purchase — event_id determinístico para deduplicar con el browser
            sendPurchaseCAPI({
              orderNumber: so.numero_pedido ?? pi.id,
              email:       order?.email_cliente ?? null,
              phone:       order?.telefono_cliente ?? null,
              firstName:   order?.nombre_cliente?.split(' ')[0] ?? null,
              lastName:    order?.nombre_cliente?.split(' ').slice(1).join(' ') ?? null,
              totalEur:    Number(so.total ?? pi.amount / 100),
              contentIds:  pi.metadata?.bundleId ? [pi.metadata.bundleId] : [],
            }).catch((e) => console.error("[stripe-webhook] CAPI Purchase error:", e));
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await updateOrderPaymentStatus(pi.id, "FAILED");
        console.log("[stripe-webhook] Pago fallido:", pi.id);

        // Intentamos obtener la orden; si no existe aún usamos los metadatos del PI
        const order = await getOrderByStripePaymentIntentId(pi.id);
        const failureReason =
          pi.last_payment_error?.message ??
          pi.last_payment_error?.code ??
          "Motivo desconocido";
        sendOrderNotification({
          orderNumber:     order?.numero_pedido ?? pi.id,
          totalEuros:      order ? Number(order.total) : pi.amount / 100,
          status:          "failed",
          paymentIntentId: pi.id,
          failureReason,
        }).catch((e) => console.error("[stripe-webhook] ntfy FAILED error:", e));

        // Pushover
        sendPushover({
          title: "❌ Pago con tarjeta fallido",
          message:
            `💳 Tarjeta rechazada\n` +
            `📧 ${pi.receipt_email ?? "email desconocido"}\n` +
            `💰 Importe: ${(pi.amount / 100).toFixed(2)}€\n` +
            `❌ Motivo: ${pi.last_payment_error?.message ?? "desconocido"}`,
          priority: 0,
          sound: "falling",
        }).catch((e) => console.error("[stripe-webhook] Pushover FAILED error:", e));
        break;
      }

      default:
        // Ignorar eventos no relevantes
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] Error procesando evento:", err instanceof Error ? err.message : err);
    // Devolver 500 hace que Stripe reintente el webhook automáticamente
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
