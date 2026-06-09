import type { LedgerEntry, ScoringRules, Stage } from "./types";

export type MatchOutcome = {
  matchId: number;
  stage: Stage;
  homeScore: number;
  awayScore: number;
  wentToPens: boolean;
  winnerTeamId: number | null;
  scorers: { playerId: number; teamId: number; isFirstGoal: boolean; isOwnGoal: boolean }[];
};

export type MatchResultPrediction = {
  matchId: number;
  homeScore: number;
  awayScore: number;
  willGoToPens: boolean;
  winnerTeamId: number | null;
};

export type MatchScorerPrediction = {
  matchId: number;
  playerId: number;
};

const isKnockout = (stage: Stage) => stage !== "group";
const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

/**
 * Puntúa el resultado de un partido (categoría 4), compartido por los modos
 * Completo y Marcador. Modelo por TIERS mutuamente excluyentes: gana el más
 * alto que aplique y se emite UNA sola entrada de ledger (`source:
 * "match_result"`), con `sourceRef.phase` y `sourceRef.exact` para que el
 * leaderboard cuente exactos y puntos de fase final.
 *
 * Fase de grupos: 5 exacto · 3 ganador+goles de un equipo · 2 ganador/empate ·
 * 1 goles de un equipo.
 * Fase final (incluye prórroga; empate predicho = va a pens, winnerTeamId =
 * quién pasa): 7 empate exacto+pens · 5 marcador exacto · 4 empate+pens ·
 * 3 ganador+goles de un equipo · 2 ganador/resultado · 1 goles de un equipo.
 */
export function scoreMatchResultPrediction(args: {
  match: MatchOutcome;
  prediction: MatchResultPrediction;
  rules: ScoringRules;
}): LedgerEntry[] {
  const { match, prediction, rules } = args;

  const exact =
    prediction.homeScore === match.homeScore &&
    prediction.awayScore === match.awayScore;
  // "goles de un equipo": uno de los dos marcadores coincide (y no es exacto).
  const oneTeam =
    !exact &&
    (prediction.homeScore === match.homeScore ||
      prediction.awayScore === match.awayScore);
  const correctOutcome =
    sign(prediction.homeScore, prediction.awayScore) ===
    sign(match.homeScore, match.awayScore);

  const ko = isKnockout(match.stage);
  let key: keyof ScoringRules | null = null;

  if (ko) {
    const predDraw = prediction.homeScore === prediction.awayScore;
    const pensOk =
      predDraw &&
      match.wentToPens &&
      prediction.winnerTeamId != null &&
      prediction.winnerTeamId === match.winnerTeamId;
    if (pensOk && exact) key = "match_ko_draw_exact_pens"; // 7
    else if (exact) key = "match_ko_exact"; // 5
    else if (pensOk) key = "match_ko_draw_pens"; // 4
    else if (correctOutcome && oneTeam) key = "match_ko_outcome_team"; // 3
    else if (correctOutcome) key = "match_ko_outcome"; // 2
    else if (oneTeam) key = "match_ko_team"; // 1
  } else {
    if (exact) key = "match_g_exact"; // 5
    else if (correctOutcome && oneTeam) key = "match_g_outcome_team"; // 3
    else if (correctOutcome) key = "match_g_outcome"; // 2
    else if (oneTeam) key = "match_g_team"; // 1
  }

  if (!key) return [];

  return [
    {
      source: "match_result",
      sourceKey: `match:${match.matchId}:result`,
      sourceRef: { matchId: match.matchId, phase: ko ? "ko" : "group", exact },
      points: rules[key].points,
    },
  ];
}

/**
 * Score per-match scorer prediction (categoría 5).
 * - 4 pts if predicted player is among the scorers of the match.
 * - +2 if predicted player scored the FIRST goal (cumulative with the 4).
 *
 * Los AUTOGOLES no cuentan: marcar en propia puerta no acredita al jugador como
 * goleador a efectos de esta predicción (coherente con la bota de oro, que
 * también los excluye). Si un jugador marca un gol válido Y un autogol en el
 * mismo partido, sí puntúa por el válido.
 */
export function scoreMatchScorerPrediction(args: {
  match: MatchOutcome;
  prediction: MatchScorerPrediction;
  rules: ScoringRules;
}): LedgerEntry[] {
  const { match, prediction, rules } = args;
  const entries: LedgerEntry[] = [];

  const playerScored = match.scorers.some(
    (s) => s.playerId === prediction.playerId && !s.isOwnGoal,
  );
  const playerScoredFirst = match.scorers.some(
    (s) => s.playerId === prediction.playerId && s.isFirstGoal && !s.isOwnGoal,
  );

  if (playerScored) {
    entries.push({
      source: "match_scorer",
      sourceKey: `match:${match.matchId}:scorer:${prediction.playerId}`,
      sourceRef: { matchId: match.matchId, playerId: prediction.playerId },
      points: rules.match_scorer.points,
    });
  }
  if (playerScoredFirst) {
    entries.push({
      source: "match_first_scorer",
      sourceKey: `match:${match.matchId}:first_scorer:${prediction.playerId}`,
      sourceRef: { matchId: match.matchId, playerId: prediction.playerId },
      points: rules.match_first_scorer_bonus.points,
    });
  }
  return entries;
}
