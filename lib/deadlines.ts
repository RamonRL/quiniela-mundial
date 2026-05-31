import { cache } from "react";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchdays, matches, predMatchResult } from "@/lib/db/schema";
import { computeMatchdayStates, type Stage } from "@/lib/matchday-state";

const SOON_MS = 24 * 60 * 60 * 1000;
const DEADLINE_TIMEOUT_MS = 4000;

export type PendingDeadline = {
  kind: "match";
  href: string;
  /** Texto principal: nombre de la jornada (Jornada 1, Octavos, …). */
  label: string;
  /** Cuándo cierra (= kickoff de este partido en concreto). */
  closesAt: string;
  msRemaining: number;
  /** Partidos sin predecir restantes en la misma jornada (incluye este). */
  missing: number;
};

export type OpenMatchdayEntry = {
  id: number;
  name: string;
  stage: Stage;
  /**
   * Hora del próximo partido upcoming dentro de la jornada — la verdadera
   * "siguiente deadline" para el usuario. La columna
   * `matchdays.predictionDeadlineAt` se queda como referencia histórica
   * ("primer kickoff") pero el flujo activo usa este campo derivado.
   */
  nextDeadlineAt: Date;
  /** Total de partidos de la jornada (denominador del "X / Y"). */
  total: number;
  /** Predicciones que el usuario ya envió en esta jornada. */
  filled: number;
  /** Partidos cuyo kickoff aún no pasó — siguen editables. */
  openMatches: number;
  /** De `openMatches`, los que el usuario aún no ha predicho. */
  missing: number;
  /**
   * Kickoff del partido MÁS INMEDIATO que el usuario aún no ha predicho
   * (de los upcoming). `null` si ya los tiene todos. Es la deadline real
   * "lo siguiente que tienes que predecir", a diferencia de
   * `nextDeadlineAt` (próximo kickoff de la jornada, predicho o no).
   */
  nextMissingAt: Date | null;
};

/**
 * Cargador único de jornadas con partidos pendientes (alguno upcoming +
 * predecesor terminado si KO) + cuánto lleva relleno el usuario en cada
 * una. Cacheado con `React.cache()` para que múltiples llamadas dentro
 * del mismo request compartan el resultado.
 *
 * Devuelve siempre `[]` si la query revienta o tarda demasiado — la UI
 * renderiza sin banner en lugar de colgar la página.
 */
export const loadOpenMatchdays = cache(
  async (userId: string, leagueId: number): Promise<OpenMatchdayEntry[]> => {
    return new Promise<OpenMatchdayEntry[]>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.error(
          `loadOpenMatchdays timeout (>${DEADLINE_TIMEOUT_MS}ms) — devolviendo []`,
        );
        resolve([]);
      }, DEADLINE_TIMEOUT_MS);
      loadOpenMatchdaysUnsafe(userId, leagueId).then(
        (v) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(v);
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          console.error("loadOpenMatchdays failed:", err);
          resolve([]);
        },
      );
    });
  },
);

async function loadOpenMatchdaysUnsafe(
  userId: string,
  leagueId: number,
): Promise<OpenMatchdayEntry[]> {
  const now = new Date();
  // Jornadas con AL MENOS UN PARTIDO upcoming. Tras el cambio a cierre
  // por partido, una jornada está "open" mientras quede algún partido
  // por arrancar — aunque su `predictionDeadlineAt` (primer kickoff) ya
  // haya pasado. Por eso ahora filtramos por matches.scheduledAt en vez
  // de por el deadline cacheado.
  const upcomingMatchdayRows = await db
    .select({ matchdayId: matches.matchdayId })
    .from(matches)
    .where(gt(matches.scheduledAt, now))
    .groupBy(matches.matchdayId);
  const candidateIds = upcomingMatchdayRows
    .map((r) => r.matchdayId)
    .filter((id): id is number => id != null);
  if (candidateIds.length === 0) return [];

  const days = await db
    .select()
    .from(matchdays)
    .where(inArray(matchdays.id, candidateIds))
    .orderBy(asc(matchdays.predictionDeadlineAt));

  // Filtramos las "waiting" (KO con predecesor sin terminar / bracket
  // sin asignar).
  const annotated = await computeMatchdayStates(
    days.map((d) => ({ id: d.id, stage: d.stage as Stage })),
  );
  const openMap = new Map(annotated.map((a) => [a.id, a]));
  const openDays = days.filter((d) => openMap.get(d.id)?.state === "open");
  if (openDays.length === 0) return [];

  const openIds = openDays.map((d) => d.id);

  // Dos queries agregadas en paralelo (antes eran cinco). Cada una hace una
  // sola pasada sobre `matches` usando agregados condicionales (FILTER):
  //   1) stats de la jornada: total de partidos, upcoming (aún predecibles) y
  //      próximo kickoff (min scheduledAt futuro).
  //   2) stats del usuario vía leftJoin 1:1 con sus predicciones: partidos ya
  //      predichos (filled) y upcoming sin predecir (missing). El join es
  //      como mucho una fila por partido (target = matchId+userId+leagueId),
  //      así que `count(*) filter (where matchId is not null)` es exacto —
  //      no infla, por lo que ya no hace falta la query separada de antes.
  const [matchStatsByDay, userStatsByDay] = await Promise.all([
    db
      .select({
        matchdayId: matches.matchdayId,
        total: sql<number>`count(*)::int`,
        openMatches: sql<number>`count(*) filter (where ${matches.scheduledAt} > now())::int`,
        nextAt: sql<string | null>`min(${matches.scheduledAt}) filter (where ${matches.scheduledAt} > now())`,
      })
      .from(matches)
      .where(inArray(matches.matchdayId, openIds))
      .groupBy(matches.matchdayId)
      .then(
        (rows) =>
          new Map(
            rows.map((r) => [
              r.matchdayId ?? 0,
              {
                total: r.total,
                openMatches: r.openMatches,
                nextAt: r.nextAt ? new Date(r.nextAt) : null,
              },
            ]),
          ),
      ),
    db
      .select({
        matchdayId: matches.matchdayId,
        filled: sql<number>`count(*) filter (where ${predMatchResult.matchId} is not null)::int`,
        missing: sql<number>`count(*) filter (where ${matches.scheduledAt} > now() and ${predMatchResult.matchId} is null)::int`,
        nextMissingAt: sql<string | null>`min(${matches.scheduledAt}) filter (where ${matches.scheduledAt} > now() and ${predMatchResult.matchId} is null)`,
      })
      .from(matches)
      .leftJoin(
        predMatchResult,
        and(
          eq(predMatchResult.matchId, matches.id),
          eq(predMatchResult.userId, userId),
          eq(predMatchResult.leagueId, leagueId),
        ),
      )
      .where(inArray(matches.matchdayId, openIds))
      .groupBy(matches.matchdayId)
      .then(
        (rows) =>
          new Map(
            rows.map((r) => [
              r.matchdayId ?? 0,
              {
                filled: r.filled ?? 0,
                missing: r.missing ?? 0,
                nextMissingAt: r.nextMissingAt ? new Date(r.nextMissingAt) : null,
              },
            ]),
          ),
      ),
  ]);

  const out: OpenMatchdayEntry[] = [];
  for (const d of openDays) {
    const stats = matchStatsByDay.get(d.id);
    if (!stats || !stats.nextAt) continue; // sin próximo kickoff → no es "open"
    const user = userStatsByDay.get(d.id);
    const openMatches = stats.openMatches;
    out.push({
      id: d.id,
      name: d.name,
      stage: d.stage as Stage,
      nextDeadlineAt: stats.nextAt,
      total: stats.total,
      filled: user?.filled ?? 0,
      openMatches,
      missing: user?.missing ?? openMatches,
      nextMissingAt: user?.nextMissingAt ?? null,
    });
  }
  out.sort((a, b) => a.nextDeadlineAt.getTime() - b.nextDeadlineAt.getTime());
  return out;
}

/**
 * Resumen rápido para el banner y el badge.
 *   - `imminent`: la jornada con el próximo partido sin predecir que cierra
 *     antes de 24 h.
 *   - `pendingCount`: total de partidos upcoming sin predecir (todas las
 *     jornadas abiertas).
 */
export async function loadDeadlineSummary(
  userId: string,
  leagueId: number,
): Promise<{
  imminent: PendingDeadline | null;
  pendingCount: number;
}> {
  const open = await loadOpenMatchdays(userId, leagueId);
  if (open.length === 0) {
    return { imminent: null, pendingCount: 0 };
  }
  const now = Date.now();
  const soonCutoff = now + SOON_MS;
  let pendingCount = 0;
  const candidates: PendingDeadline[] = [];
  for (const m of open) {
    pendingCount += m.missing;
    if (m.missing <= 0) continue;
    const closesMs = m.nextDeadlineAt.getTime();
    if (closesMs <= soonCutoff) {
      candidates.push({
        kind: "match",
        href: `/predicciones/jornada/${m.id}`,
        label: m.name,
        closesAt: m.nextDeadlineAt.toISOString(),
        msRemaining: closesMs - now,
        missing: m.missing,
      });
    }
  }
  candidates.sort((a, b) => a.msRemaining - b.msRemaining);
  return { imminent: candidates[0] ?? null, pendingCount };
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "ya cerrado";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}
