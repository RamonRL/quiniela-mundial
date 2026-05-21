import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { isPremiumTier } from "@/lib/leagues";

export const dynamic = "force-dynamic";

/**
 * Devuelve el contexto del comprador para /precios: si está logueado
 * y es owner de exactamente una quiniela privada Free, devuelve su
 * nombre y código para que el banner client del page lo muestre como
 * "Comprando para tu quiniela X".
 *
 * Si no hay match (no logueado, ninguna o varias ligas elegibles),
 * devuelve `{ league: null }`. Cache-Control: no-store para que el
 * navegador no enseñe datos viejos tras login/logout.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { league: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const owned = await db
    .select({
      name: leagues.name,
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

  if (eligible.length !== 1) {
    return NextResponse.json(
      { league: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const e = eligible[0];
  return NextResponse.json(
    { league: { name: e.name, joinCode: e.joinCode } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
