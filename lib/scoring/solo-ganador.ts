import type { MatchOutcome, MatchResultPrediction } from "./match";
import type { LedgerEntry, ScoringRules } from "./types";

const isKnockout = (stage: MatchOutcome["stage"]) => stage !== "group";
const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

/**
 * Scoring del modo "Solo Ganador". El usuario solo predice el resultado
 * (1/X/2), codificado canónicamente en `homeScore/awayScore` de
 * `predMatchResult` (local 1-0 · empate 0-0 · visitante 0-1). En KO, predecir
 * empate (0-0) significa "va a penaltis" y `winnerTeamId` lleva quién gana la
 * tanda.
 *
 * Reglas (acordadas con el usuario):
 * - Acertar el resultado de los 120' (ganador o que hay empate→pens) →
 *   `solo_winner_correct` (3).
 * - Si predijo empate y el partido fue a pens y acierta el ganador de la
 *   tanda → bonus `solo_winner_pens_bonus` (2).
 *
 * Solo se mira el SIGNO del marcador, nunca los goles concretos.
 */
export function scoreSoloGanadorPrediction(args: {
  match: MatchOutcome;
  prediction: MatchResultPrediction;
  rules: ScoringRules;
}): LedgerEntry[] {
  const { match, prediction, rules } = args;
  const entries: LedgerEntry[] = [];

  const predSign = sign(prediction.homeScore, prediction.awayScore);
  // En KO que va a pens, el marcador de 120' es un empate (sign 0); por eso
  // comparar el signo del marcador real ya captura "predijo empate→pens".
  const actualSign = sign(match.homeScore, match.awayScore);

  if (predSign === actualSign) {
    entries.push({
      source: "solo_winner",
      sourceKey: `match:${match.matchId}:solo_winner`,
      sourceRef: { matchId: match.matchId },
      points: rules.solo_winner_correct.points,
    });
  }

  // Bonus de penaltis: solo en KO, solo si predijo empate (→pens), el partido
  // realmente fue a pens y acierta quién pasa.
  if (
    isKnockout(match.stage) &&
    predSign === 0 &&
    match.wentToPens &&
    prediction.winnerTeamId != null &&
    prediction.winnerTeamId === match.winnerTeamId
  ) {
    entries.push({
      source: "solo_winner_pens",
      sourceKey: `match:${match.matchId}:solo_winner_pens`,
      sourceRef: { matchId: match.matchId, teamId: prediction.winnerTeamId },
      points: rules.solo_winner_pens_bonus.points,
    });
  }

  return entries;
}
