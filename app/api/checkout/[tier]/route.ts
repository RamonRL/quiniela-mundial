import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isPremiumTier } from "@/lib/leagues";
import { getCheckoutUrls, type PaidTierId } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

const VALID_TIERS = new Set<PaidTierId>(["team-50", "team-100", "team-250"]);

/**
 * Endpoint intermediario entre el botón "Comprar" de /precios y el
 * hosted checkout de Lemon Squeezy. Se encarga de resolver la liga
 * del usuario al click — antes lo hacía /precios al renderizar pero
 * eso obligaba a `force-dynamic` y rompía la cacheabilidad.
 *
 *  - Si el visitante está logueado y es owner de exactamente UNA
 *    quiniela privada Free → anexa su joinCode al checkout como
 *    `custom_data.league_code`. El webhook lo lee y auto-activa el
 *    Pase sin intervención manual.
 *  - Si no, redirige al checkout sin custom_data y el webhook caerá
 *    al fallback por email del comprador, o al alta manual.
 *  - Si la env var del tier no está configurada (caso típico antes
 *    de pasar LS a live mode), redirige al ancla #contacto de
 *    /precios para que el visitante deje un lead.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tier: string }> },
) {
  const { tier } = await params;
  if (!VALID_TIERS.has(tier as PaidTierId)) {
    return NextResponse.redirect(new URL("/precios", _request.url));
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

  const urls = getCheckoutUrls(leagueCode);
  const target = urls[tier as PaidTierId];
  if (!target) {
    return NextResponse.redirect(new URL("/precios#contacto", _request.url));
  }
  return NextResponse.redirect(target, { status: 302 });
}
