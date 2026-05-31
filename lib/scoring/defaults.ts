/**
 * Valores por defecto del sistema de puntuación, tal y como los definió el usuario.
 * Se cargan en la tabla `scoring_rules` durante el seed. El admin los puede editar
 * desde /admin/reglas y se recalcula automáticamente.
 */
export const DEFAULT_SCORING_RULES = {
  // Categoría 1 — Posiciones en cada grupo
  group_position_exact: { points: 3, description: "Selección en su posición exacta" },
  group_position_adjacent: { points: 1, description: "Selección en posición adyacente (±1)" },
  group_top2_swap_bonus: {
    points: 1,
    description: "Acertar quién pasa (top 2) aunque cambien el orden",
  },

  // Categoría 2 — Bracket eliminatorio
  bracket_r16: { points: 2, description: "Equipo correcto que pasa a octavos" },
  bracket_qf: { points: 4, description: "Equipo correcto que pasa a cuartos" },
  bracket_sf: { points: 7, description: "Equipo correcto que pasa a semifinales" },
  bracket_final: { points: 10, description: "Finalista correcto" },
  bracket_champion: { points: 20, description: "Campeón correcto" },

  // Categoría 3 — Máximo goleador del torneo
  top_scorer_exact: { points: 15, description: "Goleador exacto del torneo" },
  top_scorer_top3: { points: 5, description: "Tu jugador queda 2º o 3º" },
  top_scorer_top5: { points: 2, description: "Tu jugador queda entre los 5 primeros" },

  // Categoría 4 — Resultados exactos por jornada
  match_exact_score: { points: 5, description: "Marcador exacto" },
  match_outcome_only: { points: 2, description: "Acierto del ganador/empate sin marcador exacto" },
  knockout_qualifier: {
    points: 3,
    description: "En eliminatorias: aciertas el clasificado aunque sea por penaltis",
  },
  knockout_score_90: {
    points: 5,
    description: "En eliminatorias: aciertas resultado en 90'",
  },
  knockout_pens_bonus: {
    points: 2,
    description: "En eliminatorias: bonus por acertar que va a penaltis",
  },

  // Categoría 5 — Goleador por partido
  match_scorer: { points: 4, description: "Tu jugador marca en el partido" },
  match_first_scorer_bonus: { points: 2, description: "Bonus si tu jugador anota el primer gol" },

  // Modo "Solo Ganador" — solo aplica en ligas de ese modo.
  solo_winner_correct: {
    points: 3,
    description: "Solo Ganador: aciertas el ganador (o empate→pens en eliminatoria)",
  },
  solo_winner_pens_bonus: {
    points: 2,
    description:
      "Solo Ganador: bonus por, habiendo predicho empate, acertar quién gana la tanda de penaltis",
  },
} as const;

export type ScoringRuleKey = keyof typeof DEFAULT_SCORING_RULES;

export const DEFAULT_SPECIAL_PREDICTIONS = [
  {
    key: "group_stage_match_over_6_goals",
    question: "¿Habrá algún resultado con más de 6 goles totales en fase de grupos?",
    type: "yes_no" as const,
    optionsJson: null,
    pointsConfigJson: { correct: 3 },
    orderIndex: 1,
  },
  {
    key: "group_stage_total_goals",
    question: "¿Cuántos goles totales habrá en la fase de grupos? (±5 de la cifra real)",
    type: "number_range" as const,
    optionsJson: { tolerance: 5, minLikely: 100, maxLikely: 200 },
    pointsConfigJson: { correct: 5 },
    orderIndex: 2,
  },
  {
    key: "africa_in_semis",
    question: "¿Alguna selección de África llegará a semifinales?",
    type: "yes_no" as const,
    optionsJson: null,
    pointsConfigJson: { correct: 4 },
    orderIndex: 3,
  },
  {
    key: "host_furthest_round",
    question: "¿Qué anfitrión llegará más lejos y hasta qué ronda?",
    type: "team_with_round" as const,
    optionsJson: {
      teamCodes: ["USA", "CAN", "MEX"],
      rounds: ["group", "r32", "r16", "qf", "sf", "final", "champion"],
    },
    // 3 pts si aciertas qué anfitrión llegó más lejos. +5 extra si además
    // aciertas la ronda hasta la que llegó. Total máx 8.
    pointsConfigJson: { correct: 3, exactRoundBonus: 5 },
    orderIndex: 4,
  },
  {
    key: "best_goalkeeper",
    question: "Mejor portero del torneo (Guante de Oro)",
    type: "player" as const,
    optionsJson: { positionFilter: "POR" },
    pointsConfigJson: { correct: 6 },
    orderIndex: 5,
  },
  {
    key: "best_player",
    question: "Mejor jugador del torneo (Balón de Oro)",
    type: "player" as const,
    optionsJson: null,
    pointsConfigJson: { correct: 8 },
    orderIndex: 6,
  },
  // pens_in_r16 ("¿Penaltis en octavos?") se pospone hasta que termine
  // la fase de grupos y se publiquen las especiales de la fase final.
  // La migración 0005 borra el row si existe en una DB pre-existente.
] as const;

export const DEFAULT_GROUPS = [
  { code: "A", name: "Grupo A" },
  { code: "B", name: "Grupo B" },
  { code: "C", name: "Grupo C" },
  { code: "D", name: "Grupo D" },
  { code: "E", name: "Grupo E" },
  { code: "F", name: "Grupo F" },
  { code: "G", name: "Grupo G" },
  { code: "H", name: "Grupo H" },
  { code: "I", name: "Grupo I" },
  { code: "J", name: "Grupo J" },
  { code: "K", name: "Grupo K" },
  { code: "L", name: "Grupo L" },
] as const;
