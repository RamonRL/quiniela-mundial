import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isPremiumTier } from "@/lib/leagues";
import {
  getPaddleClient,
  isPaidTier,
  paddlePriceIdForTier,
  type PaidTierId,
} from "@/lib/paddle";

export const dynamic = "force-dynamic";

/**
 * Endpoint final del flujo de compra. NO se llega aquí desde un enlace
 * suelto — el botón "Comprar" de /precios apunta al gateway
 * `/precios/comprar/[tier]`, que clasifica al usuario y construye este
 * submit con `?league=<joinCode>` ya elegido.
 *
 * Por seguridad y para cerrar el caso Salvador (pago sin liga vinculada),
 * exigimos aquí TRES cosas estrictamente:
 *   1. Tier paid válido.
 *   2. Usuario autenticado.
 *   3. `?league=<joinCode>` que sea de una liga PROPIA del usuario,
 *      privada y aún en plan no-premium.
 *
 * Si falta o falla cualquiera, devolvemos al gateway que mostrará el
 * camino correcto (login, crear liga, etc.). Solo cuando los tres
 * checks pasan creamos la transaction en Paddle, y siempre con
 * `customData` completo (league_code + user_id + user_email) para que
 * el webhook resuelva el upgrade sin ambigüedad.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tier: string }> },
) {
  const { tier } = await params;
  if (!isPaidTier(tier)) {
    return NextResponse.redirect(new URL("/precios", request.url));
  }
  const tierId = tier as PaidTierId;
  const gatewayUrl = new URL(`/precios/comprar/${tierId}`, request.url);

  // 1. Auth obligatoria → si no, al gateway, que enseña el login.
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.redirect(gatewayUrl);
  }

  // 2. ?league=<joinCode> obligatorio.
  const { searchParams } = new URL(request.url);
  const leagueCode = searchParams.get("league")?.trim().toUpperCase();
  if (!leagueCode) {
    return NextResponse.redirect(gatewayUrl);
  }

  // 3. La liga debe ser PROPIA del user, privada, con joinCode coincidente y
  // aún en plan no-premium. Filtramos en el SELECT (no en JS) para que un
  // joinCode no nuestro nunca pueda materializarse.
  const [league] = await db
    .select({
      id: leagues.id,
      tier: leagues.tier,
      isPublic: leagues.isPublic,
      joinCode: leagues.joinCode,
    })
    .from(leagues)
    .where(and(eq(leagues.createdBy, me.id), eq(leagues.joinCode, leagueCode)))
    .limit(1);
  if (!league || league.isPublic || isPremiumTier(league.tier)) {
    return NextResponse.redirect(gatewayUrl);
  }

  // Paddle disponible.
  const paddle = getPaddleClient();
  const priceId = paddlePriceIdForTier(tierId);
  if (!paddle || !priceId) {
    console.warn(
      `[paddle/checkout] fallback to /precios#contacto · tier=${tier} ` +
        `clientReady=${!!paddle} priceId=${priceId ? "set" : "missing"} ` +
        `env=${process.env.PADDLE_ENV ?? "(unset)"}`,
    );
    return NextResponse.redirect(new URL("/precios#contacto", request.url));
  }

  // customData siempre completo — sin esto el webhook no puede resolver
  // el upgrade y volveríamos al caso Salvador.
  const customData: Record<string, string> = {
    tier: tierId,
    league_code: league.joinCode!,
    user_id: me.id,
    user_email: me.email,
  };

  try {
    const tx = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData,
    });
    const checkoutUrl = tx.checkout?.url;
    if (!checkoutUrl) {
      console.error("[paddle] transaction created without checkout.url", {
        txId: tx.id,
      });
      return NextResponse.redirect(new URL("/precios#contacto", request.url));
    }
    return NextResponse.redirect(checkoutUrl, { status: 303 });
  } catch (err) {
    console.error("[paddle] transactions.create failed", err);
    return NextResponse.redirect(new URL("/precios#contacto", request.url));
  }
}
