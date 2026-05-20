import { NextResponse } from "next/server";
import { after } from "next/server";
import { like } from "drizzle-orm";
import { db } from "@/lib/db";
import { commercialLeads } from "@/lib/db/schema";
import {
  formatLemonAmount,
  verifyLemonSqueezySignature,
  type LemonSqueezyOrderEvent,
} from "@/lib/lemonsqueezy";
import { notifyLemonSqueezyOrder } from "@/lib/telegram/events";

export const dynamic = "force-dynamic";

/**
 * Endpoint que recibe los webhooks de Lemon Squeezy. Verifica la
 * firma HMAC, persiste el pedido como un `commercial_leads` con
 * status="won" y notifica por Telegram para que el admin active
 * el Pase manualmente desde /admin/ligas/[id].
 *
 * Idempotencia: LS reintenta si devolvemos != 2xx (o si timea), así
 * que un mismo pedido puede llegar varias veces. Antes de insertar
 * comprobamos si ya existe un lead con `LS#<orderId>` en sus notas.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event: LemonSqueezyOrderEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const eventName = event?.meta?.event_name;
  // Solo nos interesan los pagos confirmados. LS también envía
  // subscription_created, subscription_payment_success, etc. — los
  // ignoramos silenciosamente respondiendo 200 para que LS no
  // reintente.
  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, ignored: eventName });
  }

  const attrs = event?.data?.attributes;
  const orderId = event?.data?.id;
  if (!attrs || !orderId) {
    return new NextResponse("Malformed payload", { status: 400 });
  }
  if (attrs.status !== "paid") {
    console.log(
      `[lemonsqueezy] order_created status=${attrs.status} order=${orderId}`,
    );
    return NextResponse.json({ ok: true, status: attrs.status });
  }

  const orderTag = `LS#${orderId}`;

  // Idempotencia barata: busca el tag en notas. Sin índice, pero el
  // volumen de leads es bajo y LS rara vez reintenta más de 2-3 veces.
  const [duplicate] = await db
    .select({ id: commercialLeads.id })
    .from(commercialLeads)
    .where(like(commercialLeads.notes, `%${orderTag}%`))
    .limit(1);
  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const amount = formatLemonAmount(attrs.total, attrs.currency);
  const productName = attrs.first_order_item?.product_name ?? "Pase Mundial 2026";
  const variantName = attrs.first_order_item?.variant_name;
  const fullName =
    variantName && variantName !== "Default"
      ? `${productName} · ${variantName}`
      : productName;

  await db.insert(commercialLeads).values({
    name: attrs.user_name,
    email: attrs.user_email,
    company: null,
    expectedMembers: null,
    message: `${fullName} · ${amount} · Pedido #${attrs.order_number}`,
    status: "won",
    notes: `Auto desde Lemon Squeezy. Order ID: ${orderTag}. Total: ${amount}.`,
  });

  after(() =>
    notifyLemonSqueezyOrder({
      orderId,
      orderNumber: attrs.order_number,
      productName: fullName,
      amountFormatted: amount,
      customerName: attrs.user_name,
      customerEmail: attrs.user_email,
    }),
  );

  return NextResponse.json({ ok: true });
}
