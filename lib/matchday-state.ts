import { isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
export type MatchdayState = "waiting" | "open" | "closed";

const PREDECESSOR: Record<Stage, Stage | null> = {
  group: null,
  r32: "group",
  r16: "r32",
  qf: "r16",
  sf: "qf",
  third: "sf",
  final: "sf",
};

const STAGE_LABEL: Record<Stage, string> = {
  group: "la fase de grupos",
  r32: "los dieciseisavos",
  r16: "los octavos",
  qf: "los cuartos",
  sf: "las semifinales",
  third: "el partido por el tercer puesto",
  final: "la final",
};

/**
 * Input mínimo que necesita el resolver. Ya no se le pasa
 * `predictionDeadlineAt` — la deadline pasó a ser por partido
 * (cada `match.scheduledAt`) en vez de la deadline única por jornada
 * que tenía la columna. La jornada se considera "closed" cuando
 * todos sus partidos ya arrancaron, no cuando se cumple un timestamp
 * único.
 */
export type MatchdayInput = {
  id: number;
  stage: Stage;
};

export type MatchdayStatus = {
  state: MatchdayState;
  reason?: string;
};

type StageStat = {
  total: number;
  unfinished: number;
  /** Partidos del stage cuyo home/away aún no está resuelto. */
  unmatched: number;
};

type MatchdayMatchStat = {
  total: number;
  /** Partidos cuyo kickoff ya pasó (scheduledAt <= now). */
  started: number;
  /** Partidos sin home/away (KO con bracket aún por resolver). */
  unmatched: number;
};

type AllStats = {
  stages: Map<Stage, StageStat>;
  matchdays: Map<number, MatchdayMatchStat>;
};

async function loadStats(): Promise<AllStats> {
  const [stageRows, matchdayRows] = await Promise.all([
    db
      .select({
        stage: matches.stage,
        total: sql<number>`count(*)::int`,
        unfinished: sql<number>`count(*) filter (where ${matches.status} != 'finished')::int`,
        unmatched: sql<number>`count(*) filter (where ${matches.homeTeamId} is null or ${matches.awayTeamId} is null)::int`,
      })
      .from(matches)
      .groupBy(matches.stage),
    db
      .select({
        matchdayId: matches.matchdayId,
        total: sql<number>`count(*)::int`,
        started: sql<number>`count(*) filter (where ${matches.scheduledAt} <= now())::int`,
        unmatched: sql<number>`count(*) filter (where ${matches.homeTeamId} is null or ${matches.awayTeamId} is null)::int`,
      })
      .from(matches)
      .where(isNotNull(matches.matchdayId))
      .groupBy(matches.matchdayId),
  ]);
  return {
    stages: new Map(
      stageRows.map((r) => [
        r.stage as Stage,
        { total: r.total, unfinished: r.unfinished, unmatched: r.unmatched },
      ]),
    ),
    matchdays: new Map(
      matchdayRows
        .filter((r): r is { matchdayId: number; total: number; started: number; unmatched: number } => r.matchdayId != null)
        .map((r) => [r.matchdayId, { total: r.total, started: r.started, unmatched: r.unmatched }]),
    ),
  };
}

function resolveState(matchday: MatchdayInput, stats: AllStats): MatchdayStatus {
  // Si la fase eliminatoria predecesora aún no terminó, esta jornada
  // queda "waiting" sin importar las horas de sus partidos.
  const predecessor = PREDECESSOR[matchday.stage];
  if (predecessor) {
    const predStat = stats.stages.get(predecessor);
    if (!predStat || predStat.total === 0 || predStat.unfinished > 0) {
      return {
        state: "waiting",
        reason: `Se activa cuando termine ${STAGE_LABEL[predecessor]}.`,
      };
    }
  }

  // En jornadas KO, además exigimos que los partidos del propio
  // matchday tengan home/away resueltos. Sin ellos no hay predicciones
  // posibles contra equipos concretos.
  if (matchday.stage !== "group") {
    const mdStat = stats.matchdays.get(matchday.id);
    if (!mdStat || mdStat.unmatched > 0) {
      return {
        state: "waiting",
        reason:
          matchday.stage === "r32"
            ? "Se activa cuando el admin ubique las mejores terceras en el bracket."
            : `Se activa cuando se conozcan los emparejamientos de ${STAGE_LABEL[matchday.stage]}.`,
      };
    }
  }

  // "Closed" = todos los partidos ya iniciaron. Mientras quede al menos
  // uno por arrancar, la jornada sigue "open" (aunque algunos partidos
  // ya estén cerrados individualmente — eso se gestiona partido a
  // partido en `isMatchClosed`).
  const mdStat = stats.matchdays.get(matchday.id);
  if (mdStat && mdStat.total > 0 && mdStat.started >= mdStat.total) {
    return { state: "closed" };
  }

  return { state: "open" };
}

/** Compute the state of a single matchday. */
export async function getMatchdayState(matchday: MatchdayInput): Promise<MatchdayStatus> {
  const stats = await loadStats();
  return resolveState(matchday, stats);
}

/** Compute states for many matchdays in a single round-trip. */
export async function computeMatchdayStates<T extends MatchdayInput>(
  matchdays: T[],
): Promise<(T & MatchdayStatus)[]> {
  const stats = await loadStats();
  return matchdays.map((m) => ({ ...m, ...resolveState(m, stats) }));
}

/**
 * Per-match deadline: cada partido cierra a su propio kickoff. Lo
 * usan tanto el guardado (descarta predicciones de partidos
 * iniciados) como el form de jornada (deshabilita inputs de los
 * partidos ya cerrados).
 */
export function isMatchClosed(
  match: { scheduledAt: Date | string },
  now: Date = new Date(),
): boolean {
  return new Date(match.scheduledAt).getTime() <= now.getTime();
}
