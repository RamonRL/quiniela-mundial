import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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
 * Endpoint intermediario entre el botón "Comprar" de /precios y el
 * hosted checkout de Paddle. Crea una transaction vía Paddle API con
 * los datos del comprador y el `customData` necesario para que el
 * webhook pueda resolver la liga automáticamente. Devuelve un redirect
 * al `checkout.url` que Paddle genera.
 *
 *  - Si el visitante está logueado y es owner de exactamente UNA
 *    quiniela privada Free → anexa su joinCode como `customData.league_code`
 *    y su id como `customData.user_id`. El webhook lo lee y auto-activa.
 *  - Si no, crea la transaction sin esos campos y el webhook caerá al
 *    fallback por email del comprador, o al alta manual.
 *  - Si Paddle no está configurado (env vars faltando) o falla la
 *    creación de la transaction, devolvemos al usuario a /precios#contacto
 *    para que deje un lead manual.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tier: string }> },
) {
  const { tier } = await params;
  if (!isPaidTier(tier)) {
    return NextResponse.redirect(new URL("/precios", request.url));
  }

  const paddle = getPaddleClient();
  const priceId = paddlePriceIdForTier(tier as PaidTierId);
  if (!paddle || !priceId) {
    console.warn(
      `[paddle/checkout] fallback to /precios#contacto · tier=${tier} ` +
        `clientReady=${!!paddle} priceId=${priceId ? "set" : "missing"} ` +
        `env=${process.env.PADDLE_ENV ?? "(unset)"}`,
    );
    return NextResponse.redirect(new URL("/precios#contacto", request.url));
  }

  const me = await getCurrentUser();
  let leagueCode: string | null = null;
  if (me) {
    const owned = await db
      .select({
        joinCode: leagues.joinCode,
        tier: leagues.tier,
        isPublic: leagues.isPublic,
      })
      .from(leagues)
      .where(eq(leagues.createdBy, me.id))
      .limit(3);
    const eligible = owned.filter(
      (l) => !l.isPublic && !isPremiumTier(l.tier) && l.joinCode,
    );
    if (eligible.length === 1) {
      leagueCode = eligible[0].joinCode;
    }
  }

  // customData lleva todo lo que el webhook necesita para auto-activar
  // la liga sin recurrir al fallback por email. También guardamos el
  // email del comprador aquí (cuando hay sesión) para tener un segundo
  // canal de matching aunque Paddle pierda la asociación con el customer.
  const customData: Record<string, string> = { tier };
  if (leagueCode) customData.league_code = leagueCode;
  if (me?.id) customData.user_id = me.id;
  if (me?.email) customData.user_email = me.email;

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
