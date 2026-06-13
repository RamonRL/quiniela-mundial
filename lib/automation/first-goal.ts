/** Tipos y lógica PURA de goleadores (sin DB) — testeable en aislamiento. */

export type MatchScorerInput = {
  playerId: number;
  teamId: number;
  minute: number | null;
  isOwnGoal: boolean;
  isPenalty: boolean;
  /** Opcional; si no se pasa, se deriva del minuto más bajo (sin autogoles). */
  isFirstGoal?: boolean;
};

/**
 * Marca `isFirstGoal` en el autor del PRIMER gol del partido (el de menor
 * minuto, contando TODOS los goles, también los autogoles) y SOLO si ese
 * primer gol no fue en propia puerta.
 *
 * Es decir: si el primer gol del partido es un autogol, NADIE recibe el bonus
 * de primer goleador (un autogol no acredita a ningún jugador, coherente con
 * que los autogoles no puntúan como goleador). Antes se ignoraban los
 * autogoles al buscar el minuto mínimo, lo que premiaba erróneamente al primer
 * goleador "real" aunque el partido lo hubiese abierto un gol en propia.
 *
 * `pendingMinutes` son los minutos de goleadores aún SIN MAPEAR (en cola de
 * reconciliación). Si hay un gol pendiente tan temprano o más que el primer
 * gol ya conocido, no sabemos quién marcó el primer gol del partido (ese
 * pendiente podría ser el primero, real o en propia), así que NO se adjudica
 * primer goleador a nadie hasta resolverlo.
 */
export function computeFirstGoal<T extends MatchScorerInput>(
  scorers: T[],
  pendingMinutes: (number | null)[] = [],
): T[] {
  const timed = scorers.filter((s) => s.minute != null);
  if (timed.length === 0) return scorers.map((s) => ({ ...s, isFirstGoal: false }));
  const firstMinute = Math.min(...timed.map((s) => s.minute as number));
  const earlierPending = pendingMinutes.some((m) => m != null && m <= firstMinute);
  if (earlierPending) return scorers.map((s) => ({ ...s, isFirstGoal: false }));
  return scorers.map((s) => ({
    ...s,
    isFirstGoal: !s.isOwnGoal && s.minute != null && s.minute === firstMinute,
  }));
}
