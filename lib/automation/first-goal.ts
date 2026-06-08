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

/** Marca isFirstGoal en el gol de menor minuto (excluyendo autogoles). */
export function computeFirstGoal<T extends MatchScorerInput>(scorers: T[]): T[] {
  const valid = scorers.filter((s) => !s.isOwnGoal);
  if (valid.length === 0) return scorers.map((s) => ({ ...s, isFirstGoal: false }));
  const minMinute = Math.min(
    ...valid.map((s) => (s.minute == null ? Number.POSITIVE_INFINITY : s.minute)),
  );
  return scorers.map((s) => ({
    ...s,
    isFirstGoal: !s.isOwnGoal && s.minute === minMinute,
  }));
}
