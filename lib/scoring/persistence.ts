import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
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

type LedgerInsert = {
  userId: string;
  leagueId: number;
  source: LedgerEntry["source"];
  sourceKey: string;
  sourceRef: unknown;
  points: number;
  /**
   * Marca temporal de la entrada. Para entradas de partido la fijamos al
   * `scheduledAt` del partido (no al `now()` del recompute), así "Aciertos
   * recientes" se ordena por la cronología real del torneo y no se desordena
   * cada vez que se recomputa. Si se omite, la columna usa su default `now()`.
   */
  computedAt?: Date;
};

/** Acumula las entradas frescas de un (user, league) en el buffer de inserción. */
function collectEntries(
  out: LedgerInsert[],
  userId: string,
  leagueId: number,
  entries: LedgerEntry[],
  computedAt?: Date,
) {
  for (const e of entries) {
    out.push({
      userId,
      leagueId,
      source: e.source,
      sourceKey: e.sourceKey,
      sourceRef: e.sourceRef as unknown,
      points: e.points,
      ...(computedAt ? { computedAt } : {}),
    });
  }
}

/**
 * Escritura ATÓMICA de un recompute: en UNA transacción borra todo el scope
 * (`where`) y reinserta lo fresco en lotes. Completa de una pasada o no escribe
 * nada — nunca a medias. Sustituye al patrón antiguo de una transacción por
 * predicción (miles de round-trips → minutos → el cron se cortaba dejando a
 * unos usuarios puntuados y a otros no).
 */
async function writeLedgerBatch(where: SQL, fresh: LedgerInsert[]) {
  await db.transaction(async (tx) => {
    await tx.delete(pointsLedger).where(where);
    for (let i = 0; i < fresh.length; i += 1000) {
      await tx.insert(pointsLedger).values(fresh.slice(i, i + 1000));
    }
  });
}

// ───────────────────────── match (resultado + goleador) ─────────────────────────

/** Todas las fuentes de ledger con scope de partido (clave `match:<id>:…`). */
const MATCH_LEDGER_SOURCES = [
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
] as const;

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

  // Predicciones de resultado y goleador del partido (en TODAS las ligas).
  const [resultPreds, scorerPreds] = await Promise.all([
    db.select().from(predMatchResult).where(eq(predMatchResult.matchId, matchId)),
    db.select().from(predMatchScorer).where(eq(predMatchScorer.matchId, matchId)),
  ]);
  const modes = await modesFor([
    ...resultPreds.map((p) => p.leagueId),
    ...scorerPreds.map((p) => p.leagueId),
  ]);

  // Calculamos TODAS las entradas frescas en memoria (sin tocar la DB). El
  // scoring del resultado depende del MODO de la liga:
  //   - completo/marcador → reglas de match-result (exacto/ganador/KO).
  //   - solo_ganador → solo el signo (solo_winner / solo_winner_pens).
  // El goleador (scorer + primer goleador) solo aplica en modo completo.
  // computedAt = fecha del partido (no el `now()` del recompute), para que
  // "Aciertos recientes" se ordene por la cronología real del torneo y no se
  // desordene al recomputar.
  const computedAt = match.scheduledAt ?? undefined;
  const fresh: LedgerInsert[] = [];

  for (const p of resultPreds) {
    const mode = modes.get(p.leagueId) ?? "completo";
    const prediction = {
      matchId: p.matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      willGoToPens: p.willGoToPens,
      winnerTeamId: p.winnerTeamId ?? null,
    };
    const entries =
      mode === "solo_ganador"
        ? scoreSoloGanadorPrediction({ match: outcome, prediction, rules })
        : scoreMatchResultPrediction({ match: outcome, prediction, rules });
    collectEntries(fresh, p.userId, p.leagueId, entries, computedAt);
  }

  for (const p of scorerPreds) {
    if ((modes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const entries = scoreMatchScorerPrediction({
      match: outcome,
      prediction: { matchId: p.matchId, playerId: p.playerId },
      rules,
    });
    collectEntries(fresh, p.userId, p.leagueId, entries, computedAt);
  }

  // Escritura ATÓMICA: en UNA transacción borramos todo el scope del match y
  // reinsertamos lo fresco. Antes esto era una transacción por predicción
  // (miles de round-trips → minutos): si el cron de sync se cortaba a mitad,
  // unos usuarios quedaban puntuados y otros no. Ahora es 1 DELETE + 1 INSERT
  // (en lotes): completa en una pasada o no hace nada — nunca a medias.
  const prefix = `match:${matchId}:`;
  await db.transaction(async (tx) => {
    await tx
      .delete(pointsLedger)
      .where(
        and(
          inArray(pointsLedger.source, [...MATCH_LEDGER_SOURCES]),
          sql`${pointsLedger.sourceKey} like ${prefix + "%"}`,
        ),
      );
    for (let i = 0; i < fresh.length; i += 1000) {
      await tx.insert(pointsLedger).values(fresh.slice(i, i + 1000));
    }
  });
}

async function clearMatchLedger(matchId: number) {
  // Borra entradas match-scope para ESTE match en TODAS las ligas. Se
  // regeneran cuando el match vuelva a finalizarse.
  const prefix = `match:${matchId}:`;
  await db
    .delete(pointsLedger)
    .where(
      and(
        inArray(pointsLedger.source, [...MATCH_LEDGER_SOURCES]),
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

  const fresh: LedgerInsert[] = [];
  for (const p of preds) {
    if ((modes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const entries = scoreGroupPrediction({
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
    collectEntries(fresh, p.userId, p.leagueId, entries);
  }

  await writeLedgerBatch(
    and(
      inArray(pointsLedger.source, ["group_position", "group_top2_swap"]),
      sql`${pointsLedger.sourceKey} like ${`group:${groupId}:%`}`,
    )!,
    fresh,
  );
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

  const fresh: LedgerInsert[] = [];
  for (const { userId, leagueId, teams: predictedTeamIds } of byUserLeague.values()) {
    const entries = scoreBracketStage({
      stageKey,
      predictedTeamIds,
      actualAdvancingTeamIds,
      rules,
    });
    collectEntries(fresh, userId, leagueId, entries);
  }

  await writeLedgerBatch(
    and(
      eq(pointsLedger.source, "bracket_slot"),
      sql`${pointsLedger.sourceKey} like ${`bracket:${stageKey}:%`}`,
    )!,
    fresh,
  );
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

  const fresh: LedgerInsert[] = [];
  for (const p of preds) {
    if ((modes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const entries = scoreTopScorerPrediction({
      predictedPlayerId: p.playerId,
      topScorerRanking,
      rules,
    });
    collectEntries(fresh, p.userId, p.leagueId, entries);
  }

  // Recompute global de la categoría → borra todas las entradas de bota y
  // reinserta lo fresco.
  await writeLedgerBatch(eq(pointsLedger.source, "tournament_top_scorer"), fresh);
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

  const fresh: LedgerInsert[] = [];
  for (const p of preds) {
    if ((modes.get(p.leagueId) ?? "completo") !== "completo") continue;
    const entries = scoreSpecialPrediction({
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
    collectEntries(fresh, p.userId, p.leagueId, entries);
  }

  await writeLedgerBatch(
    and(
      eq(pointsLedger.source, "special_prediction"),
      eq(pointsLedger.sourceKey, `special:${specialId}`),
    )!,
    fresh,
  );
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
