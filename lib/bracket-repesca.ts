import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, matches } from "@/lib/db/schema";

/**
 * Repesca del bracket: reapertura puntual de la edición del cuadro durante una
 * ventana corta (hasta el 2.º dieciseisavos), con el/los partidos de R32 ya
 * jugados BLOQUEADOS por caso:
 *  - quien acertó al ganador → se le fija ese ganador (mantiene su acierto);
 *  - quien falló o no rellenó → se le fija el PERDEDOR (no puede puntuar al
 *    ganador en rondas posteriores → penalización).
 * La penalización vive en el DATO (la pick bloqueada); el scorer (pertenencia a
 * conjunto) no cambia.
 */
export const BRACKET_REPESCA_KEY = "bracket_repesca_until";

export type LockedR32 = {
  /** Código del partido R32 ya jugado (p. ej. "M73"). */
  code: string;
  /** Equipo que avanzó (el que "acertó" quien lo puso). */
  advancerTeamId: number;
  /** Equipo que cayó — el "por defecto" que se asigna a fallos/repescados. */
  loserTeamId: number;
};

/** ISO hasta cuándo está abierta la repesca, o null si no hay repesca configurada. */
export async function getBracketRepescaUntil(): Promise<Date | null> {
  const [row] = await db
    .select({ v: appSettings.valueJson })
    .from(appSettings)
    .where(eq(appSettings.key, BRACKET_REPESCA_KEY))
    .limit(1);
  const raw = row?.v as { until?: string } | string | undefined;
  const iso = typeof raw === "string" ? raw : raw?.until;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ¿Está la repesca abierta ahora mismo? */
export async function isBracketRepescaActive(now: Date = new Date()): Promise<boolean> {
  const until = await getBracketRepescaUntil();
  return until != null && now < until;
}

/**
 * Cruces de R32 ya jugados (finalizados) ANTES del cierre de la repesca → quedan
 * bloqueados. Con la deadline en el 2.º R32, esto es solo M73 (Sudáfrica-Canadá).
 */
export async function getRepescaLockedR32(until: Date): Promise<LockedR32[]> {
  const rows = await db
    .select({
      code: matches.code,
      home: matches.homeTeamId,
      away: matches.awayTeamId,
      winner: matches.winnerTeamId,
      status: matches.status,
    })
    .from(matches)
    .where(and(eq(matches.stage, "r32"), lt(matches.scheduledAt, until)));
  const out: LockedR32[] = [];
  for (const m of rows) {
    if (m.status !== "finished" || m.winner == null || m.home == null || m.away == null) continue;
    const loser = m.winner === m.home ? m.away : m.home;
    out.push({ code: m.code, advancerTeamId: m.winner, loserTeamId: loser });
  }
  return out;
}

/**
 * Para un usuario, equipo a FIJAR en cada cruce bloqueado:
 *  - si tenía al ganador real en sus octavos (acertó) → el ganador;
 *  - si no (puso al perdedor o no rellenó) → el perdedor (penalización: el
 *    ganador no entra en su cuadro y no le puntúa en ninguna ronda).
 * `userR16TeamIds` = equipos que el usuario predijo que pasan de R32 (stage r16).
 */
export function computeLockedWinners(
  locked: LockedR32[],
  userR16TeamIds: Set<number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of locked) {
    out[l.code] = userR16TeamIds.has(l.advancerTeamId) ? l.advancerTeamId : l.loserTeamId;
  }
  return out;
}
