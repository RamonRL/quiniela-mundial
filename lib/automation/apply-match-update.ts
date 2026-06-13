import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { matchScorers, matches, teams } from "@/lib/db/schema";
import { logAdminAction } from "@/lib/admin/audit";
import { recomputeMatchScoringForAllUsers } from "@/lib/scoring/persistence";
import { recomputeAllGroupStandings } from "@/lib/scoring/group-standings";
import { onMatchFinalized, onMatchReverted } from "@/lib/automation/orchestrator";
import { notifyMatchResult } from "@/lib/telegram/events";
import { computeFirstGoal, type MatchScorerInput } from "@/lib/automation/first-goal";

export { computeFirstGoal, type MatchScorerInput };

export type MatchUpdateInput = {
  matchId: number;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "live" | "finished";
  wentToPens: boolean;
  homeScorePen: number | null;
  awayScorePen: number | null;
  winnerTeamId: number | null;
  scorers: MatchScorerInput[];
  /**
   * Minutos de goleadores aún SIN MAPEAR (cola de reconciliación) de este
   * partido. Si hay uno tan temprano o más que el primer gol conocido, no se
   * adjudica primer goleador hasta resolverlo. Lo pasa el sync con su lote
   * actual de pendientes; en la entrada manual va vacío.
   */
  pendingScorerMinutes?: (number | null)[];
  /** Minuto real (API). Null fuera de directo. */
  liveMinute?: number | null;
  /** Fase del proveedor (status.short): "1H","HT","2H"… para mostrar "Descanso". */
  livePhase?: string | null;
};

export type ApplyOptions = {
  /** "admin" = entrada manual (bloquea el partido a `manual`). "auto" = sync. */
  actor: "admin" | "auto";
  /** Para auditoría cuando actor==="admin". */
  adminId?: string;
};

/**
 * NÚCLEO ÚNICO de escritura de un resultado de partido — usado por la acción
 * de admin (`saveMatchResult`) y por el cron de sincronización. Garantiza un
 * solo camino probado: transacción (match + scorers) → recompute idempotente
 * de puntos → standings → orquestador (bracket/bota/specials) → revalidate →
 * audit/telegram.
 *
 * Idempotente: el ledger usa delete-then-insert por sourceKey; correrlo dos
 * veces con el mismo input deja el mismo resultado.
 *
 * Precedencia: si `actor==="admin"`, marca `result_source="manual"` para que
 * el sync NO vuelva a sobrescribir (la corrección humana gana). El sync solo
 * llama a esto sobre partidos `auto`, y registra `last_synced_at`.
 */
export async function applyMatchUpdate(
  input: MatchUpdateInput,
  opts: ApplyOptions,
): Promise<void> {
  // Primer gol del partido (contando autogoles). Si el primer gol es en propia
  // —o hay un goleador pendiente igual de temprano— no se adjudica a nadie.
  const scorers = computeFirstGoal(input.scorers, input.pendingScorerMinutes ?? []);

  const reverting = input.status === "scheduled";

  const [previousMatch] = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.id, input.matchId))
    .limit(1);
  const wasFinished = previousMatch?.status === "finished";
  const willBeFinished = input.status === "finished";

  await db.transaction(async (tx) => {
    await tx
      .update(matches)
      .set({
        homeScore: reverting ? null : input.homeScore,
        awayScore: reverting ? null : input.awayScore,
        status: input.status,
        wentToPens: reverting ? false : input.wentToPens,
        homeScorePen: reverting ? null : input.homeScorePen ?? null,
        awayScorePen: reverting ? null : input.awayScorePen ?? null,
        winnerTeamId: reverting ? null : input.winnerTeamId ?? null,
        // Minuto/fase en vivo: solo mientras está en directo. Al finalizar o
        // revertir se limpian (un partido acabado no tiene minuto en curso).
        liveMinute: input.status === "live" ? input.liveMinute ?? null : null,
        livePhase: input.status === "live" ? input.livePhase ?? null : null,
        // Precedencia y watchdog.
        ...(opts.actor === "admin"
          ? { resultSource: "manual" }
          : { lastSyncedAt: new Date() }),
      })
      .where(eq(matches.id, input.matchId));

    await tx.delete(matchScorers).where(eq(matchScorers.matchId, input.matchId));
    if (!reverting && scorers.length > 0) {
      await tx.insert(matchScorers).values(
        scorers.map((s) => ({
          matchId: input.matchId,
          playerId: s.playerId,
          teamId: s.teamId,
          minute: s.minute ?? null,
          isFirstGoal: s.isFirstGoal ?? false,
          isOwnGoal: s.isOwnGoal,
          isPenalty: s.isPenalty,
        })),
      );
    }
  });

  if (opts.adminId) {
    await logAdminAction({
      adminId: opts.adminId,
      action: "match.result.save",
      payload: { matchId: input.matchId, status: input.status, actor: opts.actor },
    });
  }

  // Reconcilia puntos siempre (revertir limpia entradas obsoletas).
  await recomputeMatchScoringForAllUsers(input.matchId);

  const [touched] = await db
    .select({ stage: matches.stage })
    .from(matches)
    .where(eq(matches.id, input.matchId))
    .limit(1);
  if (touched?.stage === "group") {
    await recomputeAllGroupStandings();
    revalidatePath("/grupos");
    revalidatePath("/grupos/[code]", "page");
    revalidatePath("/bracket");
  }

  if (willBeFinished) {
    await onMatchFinalized(input.matchId);
  } else if (wasFinished && !willBeFinished) {
    await onMatchReverted(input.matchId);
  }

  // Telegram solo en el cierre por primera vez (evita ruido al re-editar).
  if (willBeFinished && !wasFinished) {
    const homeTeams = alias(teams, "home_teams");
    const awayTeams = alias(teams, "away_teams");
    const [matchInfo] = await db
      .select({
        code: matches.code,
        stage: matches.stage,
        home: homeTeams.name,
        away: awayTeams.name,
      })
      .from(matches)
      .leftJoin(homeTeams, eq(homeTeams.id, matches.homeTeamId))
      .leftJoin(awayTeams, eq(awayTeams.id, matches.awayTeamId))
      .where(eq(matches.id, input.matchId))
      .limit(1);
    if (matchInfo) {
      const snap = matchInfo;
      after(() =>
        notifyMatchResult({
          matchId: input.matchId,
          code: snap.code,
          stage: snap.stage,
          home: snap.home ?? "TBD",
          away: snap.away ?? "TBD",
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          wentToPens: input.wentToPens ?? false,
          homeScorePen: input.homeScorePen ?? null,
          awayScorePen: input.awayScorePen ?? null,
        }),
      );
    }
  }

  revalidatePath(`/admin/partidos/${input.matchId}`);
  revalidatePath(`/partido/${input.matchId}`);
  revalidatePath("/admin/partidos");
  revalidatePath("/calendario");
  revalidatePath("/predicciones/bracket");
  revalidatePath("/predicciones");
  revalidatePath("/bracket");
  revalidatePath("/ranking");
}
