import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, specialPredictions, teams } from "@/lib/db/schema";
import { isAfricanTeam } from "@/lib/african-teams";
import { isGroupStageComplete } from "./bracket-population";

/**
 * Auto-resolución de predicciones especiales. Cada special cuya `key` matchee
 * una regla de abajo se evalúa cuando termina cualquier partido. Si su
 * condición está madura, escribimos `resolvedValueJson` + `resolvedAt`. El
 * orquestador llama después a `recomputeSpecialPredictionForAllUsers` para
 * repartir los puntos.
 *
 * Reglas auto:
 *  - group_stage_match_over_6_goals (yes_no): YES si algún group match tuvo
 *    ≥7 goles; NO al cerrar el último group match si no se dio.
 *  - group_stage_total_goals (number_range): valor = SUMA total al cerrar
 *    grupos.
 *  - africa_in_semis (yes_no): tras último QF, YES si algún SF participant
 *    es CAF, NO si no.
 *  - host_furthest_round (team_with_round): cuando el último anfitrión vivo
 *    es eliminado, o tras la final si un host la jugó.
 *
 * Reglas manuales (no se tocan):
 *  - best_goalkeeper, best_player.
 */

const HOST_CODES = ["USA", "CAN", "MEX"] as const;
type HostCode = (typeof HOST_CODES)[number];

/** Orden de rondas (más alto = más lejos). */
const ROUND_RANK: Record<string, number> = {
  group: 0,
  r32: 1,
  r16: 2,
  qf: 3,
  sf: 4,
  final: 5,
  champion: 6,
};

export type AutoResolveResult = {
  /** Specials que acabamos de resolver en esta pasada (con sus ids para que el orquestador recompute). */
  resolvedIds: number[];
};

/**
 * Re-evalúa cada special auto no resuelto y, si la condición se ha cumplido,
 * persiste la resolución. Devuelve los ids resueltos en esta pasada para que
 * el orquestador llame a `recomputeSpecialPredictionForAllUsers` por cada
 * uno.
 */
export async function evaluateAutoSpecials(): Promise<AutoResolveResult> {
  const all = await db
    .select()
    .from(specialPredictions)
    .where(isNull(specialPredictions.resolvedValueJson));

  const resolvedIds: number[] = [];

  for (const sp of all) {
    let resolved: { value: unknown } | null = null;
    if (sp.key === "group_stage_match_over_6_goals") {
      resolved = await evalOver6Goals();
    } else if (sp.key === "group_stage_total_goals") {
      resolved = await evalTotalGoalsInGroups();
    } else if (sp.key === "africa_in_semis") {
      resolved = await evalAfricaInSemis();
    } else if (sp.key === "host_furthest_round") {
      resolved = await evalHostFurthestRound();
    }
    // best_goalkeeper / best_player → manuales, ignorar.
    if (resolved == null) continue;

    await db
      .update(specialPredictions)
      .set({
        resolvedValueJson: resolved.value as object,
        resolvedAt: new Date(),
      })
      .where(eq(specialPredictions.id, sp.id));
    resolvedIds.push(sp.id);
  }

  return { resolvedIds };
}

/**
 * Cuando se revierte un partido, ciertos specials que se habían resuelto
 * podrían volver a ser indeterminados. Limpiamos los auto-resueltos
 * (`best_*` siguen intactos), y dejamos que `evaluateAutoSpecials` se
 * encargue de re-resolverlos en cuanto la condición vuelva a cumplirse.
 */
export async function clearAutoResolvedSpecials(): Promise<number[]> {
  const all = await db
    .select({ id: specialPredictions.id, key: specialPredictions.key })
    .from(specialPredictions)
    .where(
      inArray(specialPredictions.key, [
        "group_stage_match_over_6_goals",
        "group_stage_total_goals",
        "africa_in_semis",
        "host_furthest_round",
      ]),
    );
  if (all.length === 0) return [];
  const ids = all.map((s) => s.id);
  await db
    .update(specialPredictions)
    .set({ resolvedValueJson: null, resolvedAt: null })
    .where(inArray(specialPredictions.id, ids));
  return ids;
}

// ─────────────────────────── Evaluators ───────────────────────────

async function evalOver6Goals(): Promise<{ value: { value: boolean } } | null> {
  // YES tan pronto como un group match tenga totalGoals ≥ 7.
  const hits = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.stage, "group"),
        eq(matches.status, "finished"),
        sql`${matches.homeScore} + ${matches.awayScore} >= 7`,
      ),
    )
    .limit(1);
  if (hits.length > 0) return { value: { value: true } };

  // NO sólo cuando la fase de grupos haya cerrado y no haya habido ninguno.
  const groupsDone = await isGroupStageComplete();
  if (groupsDone) return { value: { value: false } };

  return null;
}

async function evalTotalGoalsInGroups(): Promise<
  { value: { value: number } } | null
> {
  const groupsDone = await isGroupStageComplete();
  if (!groupsDone) return null;
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${matches.homeScore} + ${matches.awayScore}), 0)::int`,
    })
    .from(matches)
    .where(and(eq(matches.stage, "group"), eq(matches.status, "finished")));
  return { value: { value: row?.total ?? 0 } };
}

async function evalAfricaInSemis(): Promise<{ value: { value: boolean } } | null> {
  // Resoluble cuando los 4 partidos de QF estén finished (entonces sabemos
  // los 4 SF participants vía cascade en matches table).
  const qfMatches = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.stage, "qf"));
  if (qfMatches.length === 0) return null;
  const allQfDone = qfMatches.every((m) => m.status === "finished");
  if (!allQfDone) return null;

  const sfMatches = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches)
    .where(eq(matches.stage, "sf"));
  const sfTeamIds = sfMatches
    .flatMap((m) => [m.homeTeamId, m.awayTeamId])
    .filter((x): x is number => x != null);
  if (sfTeamIds.length === 0) return null;

  const sfTeams = await db
    .select({ code: teams.code })
    .from(teams)
    .where(inArray(teams.id, sfTeamIds));
  const anyAfrican = sfTeams.some((t) => isAfricanTeam(t.code));
  return { value: { value: anyAfrican } };
}

export async function evalHostFurthestRound(): Promise<
  { value: { teamCodes: HostCode[]; round: string } } | null
> {
  // Cargo el estado actual de cada host en el torneo.
  const hostRows = await db
    .select({ id: teams.id, code: teams.code })
    .from(teams)
    .where(inArray(teams.code, [...HOST_CODES]));
  if (hostRows.length === 0) return null;

  const hostIdToCode = new Map<number, HostCode>(
    hostRows.map((h) => [h.id, h.code as HostCode]),
  );
  const hostIds = hostRows.map((h) => h.id);

  // Para cada host: ¿qué ronda alcanzó? Un host alcanzó stage S si jugó
  // un partido en S (= aparece como home/away en algún match de stage S).
  // Está vivo si su último partido NO terminó en derrota.
  const hostMatches = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      winnerTeamId: matches.winnerTeamId,
      scheduledAt: matches.scheduledAt,
    })
    .from(matches)
    .where(
      and(
        inArray(matches.stage, ["group", "r32", "r16", "qf", "sf", "final", "third"]),
        or(
          inArray(matches.homeTeamId, hostIds),
          inArray(matches.awayTeamId, hostIds),
        ),
      ),
    );

  // Agrupar por host id.
  type HostStat = {
    code: HostCode;
    furthestRound: string;
    /** ¿Quedó eliminado (= perdió) en su último partido KO? */
    eliminated: boolean;
  };
  const stats = new Map<number, HostStat>();
  for (const id of hostIds) {
    const code = hostIdToCode.get(id)!;
    stats.set(id, { code, furthestRound: "group", eliminated: false });
  }

  for (const m of hostMatches) {
    const hostInThisMatch =
      m.homeTeamId != null && hostIdToCode.has(m.homeTeamId)
        ? m.homeTeamId
        : m.awayTeamId != null && hostIdToCode.has(m.awayTeamId)
          ? m.awayTeamId
          : null;
    if (hostInThisMatch == null) continue;
    const stat = stats.get(hostInThisMatch)!;

    // Update furthest round (max stage).
    const rank = ROUND_RANK[m.stage] ?? 0;
    const currentRank = ROUND_RANK[stat.furthestRound] ?? 0;
    if (rank > currentRank) {
      stat.furthestRound = m.stage;
    }
  }

  // Determinar si el host está eliminado: KO match más reciente que
  // perdió. Si ganó la final → champion vivo (técnicamente "no eliminado",
  // pero el torneo terminó así que también resolvemos).
  for (const [hostId, stat] of stats.entries()) {
    const koMatches = hostMatches
      .filter((m) => m.stage !== "group")
      .filter(
        (m) => m.homeTeamId === hostId || m.awayTeamId === hostId,
      )
      .filter((m) => m.status === "finished")
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
    const lastKo = koMatches[0];
    if (!lastKo) {
      stat.eliminated = false;
      continue;
    }
    // Eliminado si NO ganó este último.
    stat.eliminated = lastKo.winnerTeamId !== hostId;
    if (lastKo.stage === "final" && lastKo.winnerTeamId === hostId) {
      stat.furthestRound = "champion";
    }
  }

  // ¿Todos los hosts del torneo están eliminados (o uno fue campeón → torneo terminó)?
  const allDone =
    [...stats.values()].every((s) => s.eliminated) ||
    [...stats.values()].some((s) => s.furthestRound === "champion");
  if (!allDone) return null;

  // Anfitrión(es) con la ronda más lejana. Si varios llegan igual de lejos
  // (p.ej. los 3 caen en octavos), es un empate real: todos cuentan como
  // acierto, no solo uno.
  const maxRank = Math.max(
    ...[...stats.values()].map((s) => ROUND_RANK[s.furthestRound] ?? 0),
  );
  const winners = [...stats.values()].filter(
    (s) => (ROUND_RANK[s.furthestRound] ?? 0) === maxRank,
  );
  if (winners.length === 0) return null;
  return {
    value: { teamCodes: winners.map((w) => w.code), round: winners[0].furthestRound },
  };
}
