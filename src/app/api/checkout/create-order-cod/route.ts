import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/db/orders";
import {
  orderIpRatelimit,
  orderPhoneRatelimit,
  getClientIpFromHeaders,
} from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/supabase-server";

const SPANISH_PHONE = /^(\+34|0034|34)?[6789]\d{8}$/;
const POSTCODE_ES = /^\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BodySchema = z.object({
  customerData: z.object({
    fullName: z.string().min(2).max(150).trim(),
    phone: z
      .string()
      .transform((v) => v.replace(/[\s\-]/g, ""))
      .refine((v) => SPANISH_PHONE.test(v), "Teléfono español no válido"),
    email: z.string().regex(EMAIL_RE, "Email no válido").optional(),
    address: z.string().min(5).max(200).trim(),
    postalCode: z.string().regex(POSTCODE_ES, "Código postal no válido"),
    city: z.string().min(2).max(100).trim(),
    province: z.string().min(2).max(100).trim(),
  }),
  bundleId: z.number().int().min(1).max(3),
  bundlePriceInCents: z.number().int().min(0).optional(),
  customerNotes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = await getClientIpFromHeaders();
  const { success: ipAllowed } = await orderIpRatelimit.limit(ip);
  if (!ipAllowed) {
    return NextResponse.json(
      { error: "Demasiados intentos desde esta red. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Datos de pedido inválidos." },
      { status: 422 }
    );
  }

  // Rate limit by phone
  const phone = parsed.data.customerData.phone;
  const { success: phoneAllowed } = await orderPhoneRatelimit.limit(phone);
  if (!phoneAllowed) {
    return NextResponse.json(
      { error: "Demasiados pedidos con este teléfono. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  const userId = (await getCurrentUserId()) ?? undefined
  const result = await createOrder({
    ...parsed.data,
    paymentMethod: "COD",
    userId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    orderId: result.orderId,
    orderNumber: result.orderNumber,
  });
}
