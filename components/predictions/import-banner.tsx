import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getLeagueModes } from "@/lib/leagues";
import {
  countAnyPicksInLeague,
  findLeaguesWithPicks,
  type LeagueWithPicks,
} from "@/lib/import-predictions";
import { ImportBannerClient } from "./import-banner-client";

/**
 * Server component que decide si renderizar el banner. Se muestra cuando el
 * usuario tiene OTRA quiniela del MISMO modo con MÁS predicciones que la
 * activa — esos son los únicos orígenes válidos para copiar (rellenar huecos).
 * Copiar entre modos distintos no tiene sentido (guardan cosas distintas), así
 * que se filtran. En cualquier otro caso devuelve null.
 *
 * Short-circuit barato: si el usuario solo está en una liga (la activa),
 * no hay origen posible — saltamos las 12+ queries de countAnyPicksInLeague
 * + findLeaguesWithPicks. Crítico para usuarios recién creados en la pública.
 */
export async function ImportPredictionsBanner({
  userId,
  activeLeagueId,
}: {
  userId: string;
  activeLeagueId: number;
}) {
  const [{ c: membershipCount }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.userId, userId));
  if (membershipCount <= 1) return null;

  const [activePicks, otherLeagues, modeMap] = await Promise.all([
    countAnyPicksInLeague(userId, activeLeagueId),
    findLeaguesWithPicks(userId, activeLeagueId),
    getLeagueModes([activeLeagueId]),
  ]);

  const activeMode = modeMap.get(activeLeagueId) ?? "completo";
  // Solo orígenes del MISMO modo y con MÁS picks que la activa (copiamos para
  // rellenar huecos, así que una liga con igual o menos no aporta nada).
  const sources = otherLeagues.filter(
    (l) => l.predictionMode === activeMode && l.totalPicks > activePicks,
  );
  if (sources.length === 0) return null;

  return <ImportBannerClient sources={sources} />;
}

export type { LeagueWithPicks };
