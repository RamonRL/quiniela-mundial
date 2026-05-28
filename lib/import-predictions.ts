import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  matches,
  matchdays,
  predBracketSlot,
  predGroupRanking,
  predMatchResult,
  predMatchScorer,
  predSpecial,
  predTournamentTopScorer,
  specialPredictions,
} from "@/lib/db/schema";
import { isMemberOf } from "@/lib/leagues";

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

export type LeagueWithPicks = {
  id: number;
  name: string;
  isPublic: boolean;
  totalPicks: number;
};

/**
 * Devuelve si el usuario tiene CUALQUIER predicción ya hecha en
 * `leagueId`. Suma rápidamente las 6 tablas pred_* para detectar el caso
 * "liga vacía" — usado por el banner de importar predicciones.
 */
export async function countAnyPicksInLeague(
  userId: string,
  leagueId: number,
): Promise<number> {
  const [
    [{ c: c1 }],
    [{ c: c2 }],
    [{ c: c3 }],
    [{ c: c4 }],
    [{ c: c5 }],
    [{ c: c6 }],
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(predGroupRanking)
      .where(
        and(
          eq(predGroupRanking.userId, userId),
          eq(predGroupRanking.leagueId, leagueId),
        ),
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(predBracketSlot)
      .where(
        and(
          eq(predBracketSlot.userId, userId),
          eq(predBracketSlot.leagueId, leagueId),
        ),
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(predTournamentTopScorer)
      .where(
        and(
          eq(predTournamentTopScorer.userId, userId),
          eq(predTournamentTopScorer.leagueId, leagueId),
        ),
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(predMatchResult)
      .where(
        and(
          eq(predMatchResult.userId, userId),
          eq(predMatchResult.leagueId, leagueId),
        ),
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(predMatchScorer)
      .where(
        and(
          eq(predMatchScorer.userId, userId),
          eq(predMatchScorer.leagueId, leagueId),
        ),
      ),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(predSpecial)
      .where(
        and(eq(predSpecial.userId, userId), eq(predSpecial.leagueId, leagueId)),
      ),
  ]);
  return c1 + c2 + c3 + c4 + c5 + c6;
}

/**
 * Conteo total de picks (suma de las 6 tablas pred_*) agrupado por liga para
 * un usuario. Útil para la fila de "Copiar predicciones" del perfil, donde
 * necesitamos saber cuántas tiene cada una de SUS ligas para decidir desde
 * cuál ofrecer copiar (más → menos, nunca al revés).
 */
export async function getPickCountsByLeague(
  userId: string,
): Promise<Map<number, number>> {
  const queries = await Promise.all([
    db
      .select({
        leagueId: predGroupRanking.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predGroupRanking)
      .where(eq(predGroupRanking.userId, userId))
      .groupBy(predGroupRanking.leagueId),
    db
      .select({
        leagueId: predBracketSlot.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predBracketSlot)
      .where(eq(predBracketSlot.userId, userId))
      .groupBy(predBracketSlot.leagueId),
    db
      .select({
        leagueId: predTournamentTopScorer.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predTournamentTopScorer)
      .where(eq(predTournamentTopScorer.userId, userId))
      .groupBy(predTournamentTopScorer.leagueId),
    db
      .select({
        leagueId: predMatchResult.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predMatchResult)
      .where(eq(predMatchResult.userId, userId))
      .groupBy(predMatchResult.leagueId),
    db
      .select({
        leagueId: predMatchScorer.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predMatchScorer)
      .where(eq(predMatchScorer.userId, userId))
      .groupBy(predMatchScorer.leagueId),
    db
      .select({
        leagueId: predSpecial.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predSpecial)
      .where(eq(predSpecial.userId, userId))
      .groupBy(predSpecial.leagueId),
  ]);
  const byLeague = new Map<number, number>();
  for (const rows of queries) {
    for (const r of rows) {
      byLeague.set(r.leagueId, (byLeague.get(r.leagueId) ?? 0) + r.c);
    }
  }
  return byLeague;
}

/**
 * Lista de OTRAS ligas del usuario donde tiene predicciones — para que el
 * banner ofrezca un selector de fuente.
 */
export async function findLeaguesWithPicks(
  userId: string,
  excludeLeagueId: number,
): Promise<LeagueWithPicks[]> {
  // Ejecutar 6 group-by counts y combinar en JS. Más simple que un UNION,
  // y los volúmenes son pequeños (~docenas de filas por usuario).
  const queries = await Promise.all([
    db
      .select({
        leagueId: predGroupRanking.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predGroupRanking)
      .where(eq(predGroupRanking.userId, userId))
      .groupBy(predGroupRanking.leagueId),
    db
      .select({
        leagueId: predBracketSlot.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predBracketSlot)
      .where(eq(predBracketSlot.userId, userId))
      .groupBy(predBracketSlot.leagueId),
    db
      .select({
        leagueId: predTournamentTopScorer.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predTournamentTopScorer)
      .where(eq(predTournamentTopScorer.userId, userId))
      .groupBy(predTournamentTopScorer.leagueId),
    db
      .select({
        leagueId: predMatchResult.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predMatchResult)
      .where(eq(predMatchResult.userId, userId))
      .groupBy(predMatchResult.leagueId),
    db
      .select({
        leagueId: predMatchScorer.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predMatchScorer)
      .where(eq(predMatchScorer.userId, userId))
      .groupBy(predMatchScorer.leagueId),
    db
      .select({
        leagueId: predSpecial.leagueId,
        c: sql<number>`count(*)::int`,
      })
      .from(predSpecial)
      .where(eq(predSpecial.userId, userId))
      .groupBy(predSpecial.leagueId),
  ]);
  const byLeague = new Map<number, number>();
  for (const rows of queries) {
    for (const r of rows) {
      byLeague.set(r.leagueId, (byLeague.get(r.leagueId) ?? 0) + r.c);
    }
  }
  byLeague.delete(excludeLeagueId);
  if (byLeague.size === 0) return [];

  // Hidratar nombres + isPublic.
  const ids = [...byLeague.keys()];
  const { leagues } = await import("@/lib/db/schema");
  const rows = await db
    .select({ id: leagues.id, name: leagues.name, isPublic: leagues.isPublic })
    .from(leagues)
    .where(or(...ids.map((id) => eq(leagues.id, id)))!);
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      isPublic: r.isPublic,
      totalPicks: byLeague.get(r.id) ?? 0,
    }))
    .sort((a, b) => b.totalPicks - a.totalPicks);
}

/**
 * Copia todas las predicciones de `sourceLeagueId` a `targetLeagueId` para
 * el usuario. Se respetan deadlines: si una pick de partido o jornada ya
 * tiene su deadline pasado, NO se importa (idempotente, no machaca).
 *
 * Devuelve el número de picks copiadas por categoría. La transacción es
 * atómica: o se copian todas las que aplican o se revierte.
 */
export async function importPredictionsBetweenLeagues(args: {
  userId: string;
  sourceLeagueId: number;
  targetLeagueId: number;
}): Promise<{
  groupRankings: number;
  bracket: number;
  topScorer: number;
  matchResults: number;
  matchScorers: number;
  specials: number;
}> {
  const { userId, sourceLeagueId, targetLeagueId } = args;
  if (sourceLeagueId === targetLeagueId) {
    throw new Error("La liga origen y destino son la misma.");
  }
  const [sourceMember, targetMember] = await Promise.all([
    isMemberOf(userId, sourceLeagueId),
    isMemberOf(userId, targetLeagueId),
  ]);
  if (!sourceMember) throw new Error("No eres miembro de la liga origen.");
  if (!targetMember) throw new Error("No eres miembro de la liga destino.");

  const tournamentStarted = KICKOFF.getTime() <= Date.now();

  return await db.transaction(async (tx) => {
    let groupRankings = 0;
    let bracket = 0;
    let topScorer = 0;
    let matchResults = 0;
    let matchScorers = 0;
    let specials = 0;

    // ─── Group rankings (cierran al kickoff) ───
    if (!tournamentStarted) {
      const src = await tx
        .select()
        .from(predGroupRanking)
        .where(
          and(
            eq(predGroupRanking.userId, userId),
            eq(predGroupRanking.leagueId, sourceLeagueId),
          ),
        );
      for (const p of src) {
        await tx
          .insert(predGroupRanking)
          .values({
            userId,
            leagueId: targetLeagueId,
            groupId: p.groupId,
            pos1TeamId: p.pos1TeamId,
            pos2TeamId: p.pos2TeamId,
            pos3TeamId: p.pos3TeamId,
            pos4TeamId: p.pos4TeamId,
            submittedAt: new Date(),
          })
          .onConflictDoNothing();
        groupRankings++;
      }
    }

    // ─── Bracket slots (cierran al primer R32) ───
    // La regla "fina" la hace el bracket-state; aquí copiamos siempre, las
    // picks pasadas de fecha no se podrán editar igualmente.
    const bracketSrc = await tx
      .select()
      .from(predBracketSlot)
      .where(
        and(
          eq(predBracketSlot.userId, userId),
          eq(predBracketSlot.leagueId, sourceLeagueId),
        ),
      );
    for (const p of bracketSrc) {
      await tx
        .insert(predBracketSlot)
        .values({
          userId,
          leagueId: targetLeagueId,
          stage: p.stage,
          slotPosition: p.slotPosition,
          predictedTeamId: p.predictedTeamId,
          submittedAt: new Date(),
        })
        .onConflictDoNothing();
      bracket++;
    }

    // ─── Top scorer (cierra al kickoff) ───
    if (!tournamentStarted) {
      const [src] = await tx
        .select()
        .from(predTournamentTopScorer)
        .where(
          and(
            eq(predTournamentTopScorer.userId, userId),
            eq(predTournamentTopScorer.leagueId, sourceLeagueId),
          ),
        )
        .limit(1);
      if (src) {
        await tx
          .insert(predTournamentTopScorer)
          .values({
            userId,
            leagueId: targetLeagueId,
            playerId: src.playerId,
            submittedAt: new Date(),
          })
          .onConflictDoNothing();
        topScorer = 1;
      }
    }

    // ─── Match results — solo los de partidos cuyo deadline aún no pasó ───
    const resultSrc = await tx
      .select({
        userId: predMatchResult.userId,
        matchId: predMatchResult.matchId,
        homeScore: predMatchResult.homeScore,
        awayScore: predMatchResult.awayScore,
        willGoToPens: predMatchResult.willGoToPens,
        winnerTeamId: predMatchResult.winnerTeamId,
        deadline: matchdays.predictionDeadlineAt,
      })
      .from(predMatchResult)
      .innerJoin(matches, eq(matches.id, predMatchResult.matchId))
      .innerJoin(matchdays, eq(matchdays.id, matches.matchdayId))
      .where(
        and(
          eq(predMatchResult.userId, userId),
          eq(predMatchResult.leagueId, sourceLeagueId),
        ),
      );
    const now = new Date();
    for (const p of resultSrc) {
      if (new Date(p.deadline).getTime() <= now.getTime()) continue;
      await tx
        .insert(predMatchResult)
        .values({
          userId,
          leagueId: targetLeagueId,
          matchId: p.matchId,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          willGoToPens: p.willGoToPens,
          winnerTeamId: p.winnerTeamId,
          submittedAt: new Date(),
        })
        .onConflictDoNothing();
      matchResults++;
    }

    // ─── Match scorers — mismo criterio (kickoff del propio partido) ───
    const scorerSrc = await tx
      .select({
        matchId: predMatchScorer.matchId,
        playerId: predMatchScorer.playerId,
        scheduledAt: matches.scheduledAt,
      })
      .from(predMatchScorer)
      .innerJoin(matches, eq(matches.id, predMatchScorer.matchId))
      .where(
        and(
          eq(predMatchScorer.userId, userId),
          eq(predMatchScorer.leagueId, sourceLeagueId),
        ),
      );
    for (const p of scorerSrc) {
      if (new Date(p.scheduledAt).getTime() <= now.getTime()) continue;
      await tx
        .insert(predMatchScorer)
        .values({
          userId,
          leagueId: targetLeagueId,
          matchId: p.matchId,
          playerId: p.playerId,
          submittedAt: new Date(),
        })
        .onConflictDoNothing();
      matchScorers++;
    }

    // ─── Specials — respetar closesAt por especial ───
    const specialSrc = await tx
      .select({
        specialId: predSpecial.specialId,
        valueJson: predSpecial.valueJson,
        closesAt: specialPredictions.closesAt,
      })
      .from(predSpecial)
      .innerJoin(specialPredictions, eq(specialPredictions.id, predSpecial.specialId))
      .where(
        and(
          eq(predSpecial.userId, userId),
          eq(predSpecial.leagueId, sourceLeagueId),
        ),
      );
    for (const p of specialSrc) {
      if (new Date(p.closesAt).getTime() <= now.getTime()) continue;
      await tx
        .insert(predSpecial)
        .values({
          userId,
          leagueId: targetLeagueId,
          specialId: p.specialId,
          valueJson: p.valueJson,
          submittedAt: new Date(),
        })
        .onConflictDoNothing();
      specials++;
    }

    return { groupRankings, bracket, topScorer, matchResults, matchScorers, specials };
  });
}
