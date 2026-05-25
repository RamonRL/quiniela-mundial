import { NextResponse } from "next/server";
import { after } from "next/server";
import { like } from "drizzle-orm";
import { EventName } from "@paddle/paddle-node-sdk";
import { db } from "@/lib/db";
import { commercialLeads } from "@/lib/db/schema";
import {
  formatPaddleMoney,
  getPaddleClient,
  paddleWebhookSecret,
  tierFromPaddlePriceId,
} from "@/lib/paddle";
import { autoUpgradeLeagueFromPaddleTransaction } from "@/lib/paddle-upgrade";
import { notifyPaddleOrder } from "@/lib/telegram/events";

export const dynamic = "force-dynamic";

/**
 * Endpoint que recibe los webhooks de Paddle. Verifica la firma con el
 * SDK, persiste el pago como un `commercial_leads` con status="won" y
 * notifica por Telegram para que el admin sepa que entró un pago (y si
 * fue auto-activado o requiere acción manual).
 *
 * Solo procesamos `transaction.completed` — Paddle emite muchos otros
 * eventos (created, updated, paid, billed…) que respondemos 200 para
 * que no reintenten.
 *
 * Idempotencia: Paddle reintenta si devolvemos != 2xx. Antes de
 * insertar comprobamos si ya existe un lead con `PADDLE#<txId>` en
 * sus notas — barato (LIKE sin índice) por el volumen esperado.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");
  const secret = paddleWebhookSecret();
  const paddle = getPaddleClient();

  if (!paddle || !secret || !signature) {
    return new NextResponse("Paddle webhook not configured", { status: 503 });
  }

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch (err) {
    console.error("[paddle] signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  if (event.eventType !== EventName.TransactionCompleted) {
    return NextResponse.json({ ok: true, ignored: event.eventType });
  }

  // A partir de aquí trabajamos con la transaction. La SDK tipa todo,
  // pero accedemos defensivamente porque los nested objects pueden ser
  // opcionales según la configuración del checkout.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx = event.data as any;
  const txId: string = tx.id;
  if (!txId) {
    return new NextResponse("Malformed payload", { status: 400 });
  }

  const orderTag = `PADDLE#${txId}`;
  const [duplicate] = await db
    .select({ id: commercialLeads.id })
    .from(commercialLeads)
    .where(like(commercialLeads.notes, `%${orderTag}%`))
    .limit(1);
  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Extraemos los datos relevantes con fallback.
  const customData: Record<string, string> | null = tx.customData ?? null;
  const leagueCode = customData?.league_code?.toString().trim() || null;

  const customerEmail: string =
    tx.customer?.email ??
    tx.billing?.email ??
    customData?.user_email ??
    "";
  const customerName: string =
    tx.customer?.name ??
    tx.billing?.name ??
    (customerEmail || "Cliente Paddle");

  const items = Array.isArray(tx.items) ? tx.items : [];
  const firstItem = items[0] ?? {};
  const priceId: string | null = firstItem.price?.id ?? firstItem.priceId ?? null;
  const tier = tierFromPaddlePriceId(priceId);

  // Importes — Paddle expone `details.totals` con valores en minor units.
  const currency: string = tx.currencyCode ?? "EUR";
  const totalMinor: string | number =
    tx.details?.totals?.total ?? tx.details?.totals?.subtotal ?? "0";
  const amountFormatted = formatPaddleMoney(totalMinor, currency);
  const subtotalMinor =
    Number(tx.details?.totals?.subtotal ?? totalMinor ?? 0) || 0;
  const paidAmountEur = Math.round(subtotalMinor / 100);

  let upgradeResult: Awaited<
    ReturnType<typeof autoUpgradeLeagueFromPaddleTransaction>
  > | null = null;

  if (tier && customerEmail) {
    upgradeResult = await autoUpgradeLeagueFromPaddleTransaction({
      leagueCode,
      customerEmail,
      tier,
      paidAmountEur,
      transactionId: txId,
    });
  }

  const autoOk = upgradeResult?.ok === true ? upgradeResult : null;
  const upgradeNote = autoOk
    ? `Auto upgrade a tier ${tier} (liga ${autoOk.leagueId} "${autoOk.leagueName}", via ${autoOk.resolvedBy})`
    : upgradeResult && upgradeResult.ok === false
      ? `Auto-upgrade no aplicado: ${upgradeResult.reason}. Revisar manualmente.`
      : !tier
        ? "Tier no reconocido por priceId. Revisar manualmente."
        : "Faltan datos para auto-upgrade. Revisar manualmente.";
  const leadNotes = `${upgradeNote} · Tx: ${orderTag} · Total: ${amountFormatted}.`;

  await db.insert(commercialLeads).values({
    name: customerName,
    email: customerEmail || `paddle-${txId}@unknown`,
    company: null,
    expectedMembers: null,
    message: `Paddle · ${amountFormatted} · ${tier ?? "tier ?"}`,
    status: "won",
    notes: leadNotes,
  });

  after(() =>
    notifyPaddleOrder({
      transactionId: txId,
      productName: `Pase Mundial 2026 · ${tier ?? "?"}`,
      amountFormatted,
      customerName,
      customerEmail,
      autoActivation: autoOk
        ? {
            leagueId: autoOk.leagueId,
            leagueName: autoOk.leagueName,
            resolvedBy: autoOk.resolvedBy,
          }
        : undefined,
    }),
  );

  return NextResponse.json({ ok: true, autoUpgraded: !!autoOk });
}
