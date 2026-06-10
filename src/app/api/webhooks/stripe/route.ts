import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateOrderPaymentStatus, getOrderByStripePaymentIntentId } from "@/lib/db/orders";
import { sendOrderNotification } from "@/lib/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

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
        await updateOrderPaymentStatus(pi.id, "PAID");
        console.log("[stripe-webhook] Pago confirmado:", pi.id);

        // Notificación ntfy — buscamos la orden completa para incluir los datos del cliente
        const order = await getOrderByStripePaymentIntentId(pi.id);
        const firstItem = order?.order_items?.[0];
        sendOrderNotification({
          orderNumber:      order?.order_number ?? pi.id,
          customerName:     order?.shipping_name ?? 'Desconocido',
          customerPhone:    order?.shipping_phone,
          address:          order?.shipping_address,
          city:             order?.shipping_city,
          province:         order?.shipping_province,
          bundleName:       firstItem?.bundle_name ?? pi.metadata?.bundleName ?? undefined,
          totalEuros:       order ? Number(order.total) : pi.amount / 100,
          paymentMethod:    'CARD',
          status:           'confirmed',
          paymentIntentId:  pi.id,
        }).catch((e) => console.error("[stripe-webhook] ntfy CONFIRMED error:", e));
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
          orderNumber:     order?.order_number ?? pi.id,
          customerName:    order?.shipping_name ?? 'Desconocido',
          bundleName:      order?.order_items?.[0]?.bundle_name ?? pi.metadata?.bundleName ?? undefined,
          totalEuros:      order ? Number(order.total) : pi.amount / 100,
          paymentMethod:   'CARD',
          status:          'failed',
          paymentIntentId: pi.id,
          failureReason,
        }).catch((e) => console.error("[stripe-webhook] ntfy FAILED error:", e));
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
