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

  // Categoría 4 — Resultado del partido · FASE DE GRUPOS (tiers excluyentes)
  match_g_exact: { points: 5, description: "Grupos: marcador exacto" },
  match_g_outcome_team: {
    points: 3,
    description: "Grupos: ganador correcto + goles de un equipo",
  },
  match_g_outcome: {
    points: 2,
    description: "Grupos: ganador o empate correcto, sin marcador exacto",
  },
  match_g_team: {
    points: 1,
    description: "Grupos: goles de un equipo, sin acertar el ganador",
  },

  // Categoría 4 — Resultado del partido · FASE FINAL / eliminatoria (tiers excluyentes)
  match_ko_draw_exact_pens: {
    points: 7,
    description: "Final: empate exacto (incl. prórroga) + ganador en penaltis",
  },
  match_ko_exact: {
    points: 5,
    description: "Final: marcador exacto (incl. prórroga)",
  },
  match_ko_draw_pens: {
    points: 4,
    description: "Final: empate no exacto + ganador en penaltis",
  },
  match_ko_outcome_team: {
    points: 3,
    description: "Final: ganador correcto + goles de un equipo (incl. prórroga)",
  },
  match_ko_outcome: {
    points: 2,
    description: "Final: ganador/resultado correcto, sin marcador exacto",
  },
  match_ko_team: {
    points: 1,
    description: "Final: goles de un equipo, sin acertar el resultado",
  },

  // Categoría 5 — Goleador por partido (solo modo Completo)
  match_scorer: { points: 4, description: "Tu jugador marca en el partido" },
  match_first_scorer_bonus: { points: 2, description: "Bonus si tu jugador anota el primer gol" },

  // Modo "Solo Ganador" — tiers excluyentes (solo aplica en ligas de ese modo).
  solo_g_correct: {
    points: 3,
    description: "Solo Ganador · grupos: aciertas el ganador o el empate",
  },
  solo_ko_draw_pens: {
    points: 5,
    description: "Solo Ganador · final: empate (incl. prórroga) + ganador en penaltis",
  },
  solo_ko_correct: {
    points: 3,
    description: "Solo Ganador · final: aciertas ganador o empate, sin el ganador de pens",
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
