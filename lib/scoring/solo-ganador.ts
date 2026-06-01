import type { MatchOutcome, MatchResultPrediction } from "./match";
import type { LedgerEntry, ScoringRules } from "./types";

const isKnockout = (stage: MatchOutcome["stage"]) => stage !== "group";
const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

/**
 * Scoring del modo "Solo Ganador". El usuario solo predice el resultado
 * (1/X/2), codificado canónicamente en `homeScore/awayScore` de
 * `predMatchResult` (local 1-0 · empate 0-0 · visitante 0-1). En KO, predecir
 * empate (0-0) significa "va a penaltis" y `winnerTeamId` lleva quién gana la
 * tanda. Solo se mira el SIGNO del marcador, nunca los goles concretos.
 *
 * Modelo por TIERS (una sola entrada `solo_winner`):
 *  - Grupos: 3 por acertar ganador o empate (`solo_g_correct`).
 *  - Final: 5 si predijo empate→pens y acierta el ganador de la tanda
 *    (`solo_ko_draw_pens`); si no, 3 por acertar ganador o empate
 *    (`solo_ko_correct`). 0 por fallar.
 */
export function scoreSoloGanadorPrediction(args: {
  match: MatchOutcome;
  prediction: MatchResultPrediction;
  rules: ScoringRules;
}): LedgerEntry[] {
  const { match, prediction, rules } = args;

  const predSign = sign(prediction.homeScore, prediction.awayScore);
  const actualSign = sign(match.homeScore, match.awayScore);
  const correct = predSign === actualSign;
  const ko = isKnockout(match.stage);

  let key: keyof ScoringRules | null = null;
  if (ko) {
    const pensOk =
      predSign === 0 &&
      match.wentToPens &&
      prediction.winnerTeamId != null &&
      prediction.winnerTeamId === match.winnerTeamId;
    if (pensOk) key = "solo_ko_draw_pens"; // 5
    else if (correct) key = "solo_ko_correct"; // 3
  } else if (correct) {
    key = "solo_g_correct"; // 3
  }

  if (!key) return [];

  return [
    {
      source: "solo_winner",
      sourceKey: `match:${match.matchId}:solo_winner`,
      sourceRef: { matchId: match.matchId, phase: ko ? "ko" : "group" },
      points: rules[key].points,
    },
  ];
}
