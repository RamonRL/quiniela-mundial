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

  // 4 queries agregadas en paralelo:
  //   - total partidos por jornada
  //   - partidos upcoming por jornada (los que aún se pueden predecir)
  //   - próximo kickoff (min scheduledAt > now) por jornada
  //   - predicciones del usuario por jornada (filled) + upcoming sin predecir (missing)
  const [totalsByDay, openByDay, nextDeadlineByDay, userByDay] = await Promise.all([
    db
      .select({
        matchdayId: matches.matchdayId,
        total: sql<number>`count(*)::int`,
      })
      .from(matches)
      .where(inArray(matches.matchdayId, openIds))
      .groupBy(matches.matchdayId)
      .then((rows) => new Map(rows.map((r) => [r.matchdayId ?? 0, r.total]))),
    db
      .select({
        matchdayId: matches.matchdayId,
        openMatches: sql<number>`count(*)::int`,
      })
      .from(matches)
      .where(
        and(inArray(matches.matchdayId, openIds), gt(matches.scheduledAt, now)),
      )
      .groupBy(matches.matchdayId)
      .then(
        (rows) => new Map(rows.map((r) => [r.matchdayId ?? 0, r.openMatches])),
      ),
    db
      .select({
        matchdayId: matches.matchdayId,
        nextAt: sql<Date>`min(${matches.scheduledAt})`,
      })
      .from(matches)
      .where(
        and(inArray(matches.matchdayId, openIds), gt(matches.scheduledAt, now)),
      )
      .groupBy(matches.matchdayId)
      .then(
        (rows) => new Map(rows.map((r) => [r.matchdayId ?? 0, new Date(r.nextAt)])),
      ),
    db
      .select({
        matchdayId: matches.matchdayId,
        filled: sql<number>`count(*)::int`,
        missingUpcoming: sql<number>`count(*) filter (where ${matches.scheduledAt} > now() and ${predMatchResult.matchId} is null)::int`,
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
                filled:
                  Number.isFinite(r.filled) && r.filled > 0
                    ? // El leftJoin cuenta filas con prediction != null. Usamos
                      // un filter más explícito para ser robustos.
                      r.filled
                    : 0,
                missing: r.missingUpcoming ?? 0,
              },
            ]),
          ),
      ),
  ]);

  // Re-pegamos: en el leftJoin, "filled" cuenta filas con prediction; pero
  // PG agrupa filas del leftJoin incluyendo NULL → puede inflar. Calculamos
  // filled aparte con una query exacta para evitar errores.
  const filledByDay = await db
    .select({
      matchdayId: matches.matchdayId,
      filled: sql<number>`count(*)::int`,
    })
    .from(predMatchResult)
    .innerJoin(matches, eq(matches.id, predMatchResult.matchId))
    .where(
      and(
        eq(predMatchResult.userId, userId),
        eq(predMatchResult.leagueId, leagueId),
        inArray(matches.matchdayId, openIds),
      ),
    )
    .groupBy(matches.matchdayId)
    .then((rows) => new Map(rows.map((r) => [r.matchdayId ?? 0, r.filled])));

  const out: OpenMatchdayEntry[] = [];
  for (const d of openDays) {
    const total = totalsByDay.get(d.id) ?? 0;
    const openMatches = openByDay.get(d.id) ?? 0;
    const nextAt = nextDeadlineByDay.get(d.id);
    if (!nextAt) continue; // safety: si no hay próximo kickoff, no es "open"
    const filled = filledByDay.get(d.id) ?? 0;
    const missing = userByDay.get(d.id)?.missing ?? openMatches;
    out.push({
      id: d.id,
      name: d.name,
      stage: d.stage as Stage,
      nextDeadlineAt: nextAt,
      total,
      filled,
      openMatches,
      missing,
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
