import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupStandings,
  matchScorers,
  matches,
  pointsLedger,
  predBracketSlot,
  predGroupRanking,
  predMatchResult,
  predMatchScorer,
  predSpecial,
  predTournamentTopScorer,
  scoringRules,
  specialPredictions,
} from "@/lib/db/schema";
import {
  scoreBracketStage,
  scoreGroupPrediction,
  scoreMatchResultPrediction,
  scoreMatchScorerPrediction,
  scoreSoloGanadorPrediction,
  scoreSpecialPrediction,
  scoreTopScorerPrediction,
  type BracketStageKey,
  type LedgerEntry,
  type MatchOutcome,
  type ScoringRules,
} from "./index";
import { DEFAULT_SCORING_RULES } from "./defaults";
import { getLeagueModes } from "@/lib/leagues";

/** Modos de un conjunto de ligas (dedup). Default completo si falta. */
async function modesFor(leagueIds: number[]) {
  return getLeagueModes([...new Set(leagueIds)]);
}

// Tras la migración multi-liga, todas las predicciones y entradas del ledger
// están scopeadas por leagueId. Las funciones recompute* iteran cada
// (user, league) tuple individualmente — la lógica pura de scoring no cambia.

export async function loadScoringRules(): Promise<ScoringRules> {
  const rows = await db.select().from(scoringRules);
  const result = { ...DEFAULT_SCORING_RULES } as ScoringRules;
  for (const row of rows) {
    const value = row.valueJson as { points?: number; description?: string } | null;
    if (!value || typeof value.points !== "number") continue;
    (result as Record<string, { points: number; description?: string }>)[row.key] = {
      points: value.points,
      description: value.description,
    };
  }
  return result;
}

async function replaceLedgerEntries(args: {
  userId: string;
  leagueId: number;
  source: LedgerEntry["source"];
  sourceKeys: string[];
  fresh: LedgerEntry[];
}) {
  const { userId, leagueId, source, sourceKeys, fresh } = args;
  if (sourceKeys.length === 0 && fresh.length === 0) return;

  await db.transaction(async (tx) => {
    if (sourceKeys.length > 0) {
      await tx
        .delete(pointsLedger)
        .where(
          and(
            eq(pointsLedger.userId, userId),
            eq(pointsLedger.leagueId, leagueId),
            eq(pointsLedger.source, source),
            inArray(pointsLedger.sourceKey, sourceKeys),
          ),
        );
    }
    if (fresh.length > 0) {
      await tx.insert(pointsLedger).values(
        fresh.map((e) => ({
          userId,
          leagueId,
          source: e.source,
          sourceKey: e.sourceKey,
          sourceRef: e.sourceRef as unknown,
          points: e.points,
        })),
      );
    }
  });
}

// ───────────────────────── match (resultado + goleador) ─────────────────────────

export async function recomputeMatchScoringForAllUsers(matchId: number) {
  const rules = await loadScoringRules();

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) return;
  if (
    match.homeScore == null ||
    match.awayScore == null ||
    match.status !== "finished"
  ) {
    await clearMatchLedger(matchId);
    return;
  }

  const scorerRows = await db
    .select()
    .from(matchScorers)
    .where(eq(matchScorers.matchId, matchId));

  const outcome: MatchOutcome = {
    matchId: match.id,
    stage: match.stage,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    wentToPens: match.wentToPens,
    winnerTeamId: match.winnerTeamId ?? null,
    scorers: scorerRows.map((s) => ({
      playerId: s.playerId,
      teamId: s.teamId,
      isFirstGoal: s.isFirstGoal,
      isOwnGoal: s.isOwnGoal,
    })),
  };

  // Result predictions — un row por (user, league, match). El scoring del
  // resultado depende del MODO de la liga:
  //   - completo/marcador → mismas reglas de match-result (exacto/ganador/KO).
  //   - solo_ganador → solo el signo (solo_winner / solo_winner_pens).
  const resultPreds = await db
    .select()
    .from(predMatchResult)
    .where(eq(predMatchResult.matchId, matchId));
  const resultModes = await modesFor(resultPreds.map((p) => p.leagueId));

  for (const p of resultPreds) {
    const mode = resultModes.get(p.leagueId) ?? "completo";
    const prediction = {
      matchId: p.matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      willGoToPens: p.willGoToPens,
      winnerTeamId: p.winnerTeamId ?? null,
    };

    if (mode === "solo_ganador") {
      const fresh = scoreSoloGanadorPrediction({ match: outcome, prediction, rules });
      await replaceLedgerEntries({
        userId: p.userId,
        leagueId: p.leagueId,
        source: "solo_winner",
        sourceKeys: [`match:${matchId}:solo_winner`],
        fresh,
      });
      continue;
    }

    // completo + marcador → una sola entrada `match_result` con el tier.
    const fresh = scoreMatchResultPrediction({ match: outcome, prediction, rules });
    await replaceLedgerEntries({
      userId: p.userId,
      leagueId: p.leagueId,
      source: "match_result",
      sourceKeys: [`match:${matchId}:result`],
      fresh,
    });
  }

  // Scorer predictions — solo aplican en modo completo. (En marcador y
  // solo_ganador el UI no expone goleador; el modo es inmutable, así que
  // saltamos defensivamente las ligas no-completo.)
  const scorerPreds = await db
    .select()
    .from(predMatchScorer)
    .where(eq(predMatchScorer.matchId, matchId));
  const scorerModes = await modesFor(scorerPreds.map((p) => p.leagueId));

  for (const p of scorerPreds) {
    if ((scorerModes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const fresh = scoreMatchScorerPrediction({
      match: outcome,
      prediction: { matchId: p.matchId, playerId: p.playerId },
      rules,
    });
    for (const source of ["match_scorer", "match_first_scorer"] as const) {
      const sourceKeys = [
        `match:${matchId}:scorer:${p.playerId}`,
        `match:${matchId}:first_scorer:${p.playerId}`,
      ].filter((k) => keyBelongsToSource(k, source));
      await replaceLedgerEntries({
        userId: p.userId,
        leagueId: p.leagueId,
        source,
        sourceKeys,
        fresh: fresh.filter((e) => e.source === source),
      });
    }
  }
}

function keyBelongsToSource(key: string, source: LedgerEntry["source"]) {
  switch (source) {
    case "match_exact_score":
      return key.endsWith(":exact");
    case "match_outcome":
      return key.endsWith(":outcome");
    case "knockout_score_90":
      return key.endsWith(":score90");
    case "knockout_qualifier":
      return key.endsWith(":qualifier");
    case "knockout_pens_bonus":
      return key.endsWith(":pens_bonus");
    case "match_scorer":
      return key.includes(":scorer:") && !key.includes(":first_scorer:");
    case "match_first_scorer":
      return key.includes(":first_scorer:");
    default:
      return false;
  }
}

async function clearMatchLedger(matchId: number) {
  // Borra entradas match-scope para ESTE match en TODAS las ligas. Se
  // regeneran cuando el match vuelva a finalizarse.
  const prefix = `match:${matchId}:`;
  await db
    .delete(pointsLedger)
    .where(
      and(
        inArray(pointsLedger.source, [
          "match_result",
          "solo_winner",
          "match_scorer",
          "match_first_scorer",
          // Fuentes del modelo viejo — inertes salvo datos pre-existentes.
          "match_exact_score",
          "match_outcome",
          "knockout_score_90",
          "knockout_qualifier",
          "knockout_pens_bonus",
          "solo_winner_pens",
        ]),
        sql`${pointsLedger.sourceKey} like ${prefix + "%"}`,
      ),
    );
}

// ───────────────────────── group rankings ─────────────────────────

export async function recomputeGroupScoringForAllUsers(groupId: number) {
  const rules = await loadScoringRules();
  const standings = await db
    .select()
    .from(groupStandings)
    .where(eq(groupStandings.groupId, groupId));
  if (standings.length === 0) return;

  const actual = standings.map((s) => ({
    teamId: s.teamId,
    position: clampPosition(s.position),
  }));

  const preds = await db
    .select()
    .from(predGroupRanking)
    .where(eq(predGroupRanking.groupId, groupId));
  // Grupos solo puntúan en ligas de modo completo.
  const modes = await modesFor(preds.map((p) => p.leagueId));

  for (const p of preds) {
    if ((modes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const fresh = scoreGroupPrediction({
      groupId,
      prediction: {
        pos1TeamId: p.pos1TeamId,
        pos2TeamId: p.pos2TeamId,
        pos3TeamId: p.pos3TeamId,
        pos4TeamId: p.pos4TeamId,
      },
      actual,
      rules,
    });
    const teamKeys = [p.pos1TeamId, p.pos2TeamId, p.pos3TeamId, p.pos4TeamId]
      .filter((x): x is number => x != null)
      .map((tid) => `group:${groupId}:team:${tid}`);
    await replaceLedgerEntries({
      userId: p.userId,
      leagueId: p.leagueId,
      source: "group_position",
      sourceKeys: teamKeys,
      fresh: fresh.filter((e) => e.source === "group_position"),
    });
    await replaceLedgerEntries({
      userId: p.userId,
      leagueId: p.leagueId,
      source: "group_top2_swap",
      sourceKeys: [`group:${groupId}:top2_swap`],
      fresh: fresh.filter((e) => e.source === "group_top2_swap"),
    });
  }
}

function clampPosition(p: number): 1 | 2 | 3 | 4 {
  if (p <= 1) return 1;
  if (p === 2) return 2;
  if (p === 3) return 3;
  return 4;
}

// ───────────────────────── bracket stages ─────────────────────────

export async function recomputeBracketStageForAllUsers(
  stageKey: BracketStageKey,
  actualAdvancingTeamIds: number[],
) {
  const rules = await loadScoringRules();
  const preds = await db
    .select()
    .from(predBracketSlot)
    .where(eq(predBracketSlot.stage, mapBracketStageToMatchStage(stageKey)));

  // Bracket solo puntúa en ligas de modo completo.
  const bracketModes = await modesFor(preds.map((p) => p.leagueId));

  // Agrupar predicciones por (user, league).
  const byUserLeague = new Map<string, { userId: string; leagueId: number; teams: number[] }>();
  for (const p of preds) {
    if (!p.predictedTeamId) continue;
    if ((bracketModes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const key = `${p.userId}:${p.leagueId}`;
    const existing = byUserLeague.get(key);
    if (existing) {
      existing.teams.push(p.predictedTeamId);
    } else {
      byUserLeague.set(key, {
        userId: p.userId,
        leagueId: p.leagueId,
        teams: [p.predictedTeamId],
      });
    }
  }

  if (stageKey === "champion") {
    // Champion vive como stage='final' slot=0; lo computa el scorer dedicado.
    void preds;
  }

  for (const { userId, leagueId, teams: predictedTeamIds } of byUserLeague.values()) {
    const fresh = scoreBracketStage({
      stageKey,
      predictedTeamIds,
      actualAdvancingTeamIds,
      rules,
    });
    const allKeys = predictedTeamIds.map((tid) => `bracket:${stageKey}:team:${tid}`);
    await replaceLedgerEntries({
      userId,
      leagueId,
      source: "bracket_slot",
      sourceKeys: allKeys,
      fresh,
    });
  }
}

function mapBracketStageToMatchStage(stage: BracketStageKey) {
  switch (stage) {
    case "r16":
      return "r16" as const;
    case "qf":
      return "qf" as const;
    case "sf":
      return "sf" as const;
    case "final":
      return "final" as const;
    case "champion":
      return "final" as const;
  }
}

// ───────────────────────── tournament top scorer ─────────────────────────

export async function recomputeTopScorerForAllUsers(topScorerRanking: number[]) {
  const rules = await loadScoringRules();
  const preds = await db.select().from(predTournamentTopScorer);
  // Bota de oro solo puntúa en ligas de modo completo.
  const modes = await modesFor(preds.map((p) => p.leagueId));

  for (const p of preds) {
    if ((modes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const fresh = scoreTopScorerPrediction({
      predictedPlayerId: p.playerId,
      topScorerRanking,
      rules,
    });
    const sourceKeys = p.playerId ? [`tournament_top_scorer:${p.playerId}`] : [];
    await replaceLedgerEntries({
      userId: p.userId,
      leagueId: p.leagueId,
      source: "tournament_top_scorer",
      sourceKeys,
      fresh,
    });
  }
}

// ───────────────────────── special predictions ─────────────────────────

export async function recomputeSpecialPredictionForAllUsers(specialId: number) {
  const [def] = await db
    .select()
    .from(specialPredictions)
    .where(eq(specialPredictions.id, specialId))
    .limit(1);
  if (!def) return;

  const preds = await db
    .select()
    .from(predSpecial)
    .where(eq(predSpecial.specialId, specialId));
  // Especiales solo puntúan en ligas de modo completo.
  const modes = await modesFor(preds.map((p) => p.leagueId));

  for (const p of preds) {
    if ((modes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const fresh = scoreSpecialPrediction({
      special: {
        id: def.id,
        key: def.key,
        type: def.type,
        optionsJson: def.optionsJson,
        pointsConfigJson: def.pointsConfigJson,
        resolvedValueJson: def.resolvedValueJson,
      },
      userValueJson: p.valueJson,
    });
    await replaceLedgerEntries({
      userId: p.userId,
      leagueId: p.leagueId,
      source: "special_prediction",
      sourceKeys: [`special:${specialId}`],
      fresh,
    });
  }
}

// ───────────────────────── scoring rule edits ─────────────────────────

/**
 * After an admin edits any scoring rule, this re-runs every category for every
 * user. Slower but idempotent.
 */
export async function recomputeAllScoring() {
  // Match-related (every finished match)
  const finishedMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.status, "finished"));
  for (const m of finishedMatches) {
    await recomputeMatchScoringForAllUsers(m.id);
  }

  // Group standings (every group with finalized standings)
  const finalizedGroups = await db
    .selectDistinctOn([groupStandings.groupId], { groupId: groupStandings.groupId })
    .from(groupStandings);
  for (const g of finalizedGroups) {
    await recomputeGroupScoringForAllUsers(g.groupId);
  }

  // Resolved specials
  const resolvedSpecials = await db
    .select({ id: specialPredictions.id })
    .from(specialPredictions);
  for (const s of resolvedSpecials) {
    await recomputeSpecialPredictionForAllUsers(s.id);
  }
}
