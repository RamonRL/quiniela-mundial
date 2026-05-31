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
import {
  autoUpgradeLeagueFromPaddleTransaction,
  createPaidLeagueFromTransaction,
} from "@/lib/paddle-upgrade";
import { DEFAULT_PRESET_LOGO_URL } from "@/lib/league-logos";
import type { PredictionMode } from "@/lib/prediction-modes";
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

  // Distinguimos config-faltante (503, problema nuestro/Vercel) de
  // firma-ausente (400, llamada mal formada) para diagnosticar en logs.
  if (!paddle || !secret) {
    console.error(
      `[paddle/webhook] config incompleta · client=${!!paddle} secret=${!!secret}`,
    );
    return new NextResponse("Paddle webhook not configured", { status: 503 });
  }
  if (!signature) {
    console.warn("[paddle/webhook] petición sin header paddle-signature");
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch (err) {
    console.error("[paddle/webhook] verificación de firma falló", err);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  console.log(`[paddle/webhook] evento recibido: ${event.eventType}`);

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

  // Flujo "pagar antes de crear": el customData trae la spec de la liga y
  // aún no existe. La creamos (idempotente vía paidTxId) como respaldo de
  // `finalizePaidLeague` del cliente.
  const createLeagueFlow = customData?.create_league === "1";

  let autoActivation:
    | { leagueId: number; leagueName: string; resolvedBy: "league_code" | "email" | "created" }
    | null = null;
  let upgradeNote: string;

  if (createLeagueFlow && tier && customData?.user_id) {
    const mode = (
      ["completo", "marcador", "solo_ganador"].includes(customData.league_mode ?? "")
        ? customData.league_mode
        : "completo"
    ) as PredictionMode;
    try {
      const created = await createPaidLeagueFromTransaction({
        txId,
        userId: customData.user_id,
        tier,
        name: (customData.league_name ?? "Mi quiniela").slice(0, 25),
        mode,
        logoUrl: customData.league_logo || DEFAULT_PRESET_LOGO_URL,
        paidAmountEur,
      });
      autoActivation = {
        leagueId: created.leagueId,
        leagueName: created.leagueName,
        resolvedBy: "created",
      };
      upgradeNote = created.created
        ? `Liga creada por pago (tier ${tier}, id ${created.leagueId} "${created.leagueName}")`
        : `Liga ya existente para esta tx (id ${created.leagueId}) — sin duplicar`;
    } catch (err) {
      console.error("[paddle/webhook] createPaidLeagueFromTransaction falló", err);
      upgradeNote = "Pago de creación de liga recibido pero la creación falló. Revisar manualmente.";
    }
  } else {
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
    if (upgradeResult?.ok === true) {
      autoActivation = {
        leagueId: upgradeResult.leagueId,
        leagueName: upgradeResult.leagueName,
        resolvedBy: upgradeResult.resolvedBy,
      };
      upgradeNote = `Auto upgrade a tier ${tier} (liga ${upgradeResult.leagueId} "${upgradeResult.leagueName}", via ${upgradeResult.resolvedBy})`;
    } else if (upgradeResult && upgradeResult.ok === false) {
      upgradeNote = `Auto-upgrade no aplicado: ${upgradeResult.reason}. Revisar manualmente.`;
    } else if (!tier) {
      upgradeNote = "Tier no reconocido por priceId. Revisar manualmente.";
    } else {
      upgradeNote = "Faltan datos para auto-upgrade. Revisar manualmente.";
    }
  }

  const autoOk = autoActivation;
  const leadNotes = `${upgradeNote} · Tx: ${orderTag} · Total: ${amountFormatted}.`;

  console.log(
    `[paddle/webhook] tx=${txId} tier=${tier ?? "?"} email=${customerEmail || "(vacío)"} ` +
      `league_code=${leagueCode ?? "(none)"} → ${upgradeNote}`,
  );

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
