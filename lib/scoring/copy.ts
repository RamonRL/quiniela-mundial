import type { ScoringSection } from "@/components/brand/scoring-box";

/**
 * Spanish-language copy for the scoring rules of each prediction category,
 * mirroring `lib/scoring/defaults.ts`. Centralised here so the hub cards
 * and the detail pages render the exact same numbers and labels.
 *
 * If a rule changes in `defaults.ts`, update it here too.
 */

export const GROUPS_SCORING: ScoringSection[] = [
  {
    rules: [
      { points: 3, label: "Selección en su posición exacta (1º, 2º, 3º o 4º)" },
      { points: 1, label: "Selección a ±1 posición de la real" },
      { points: 1, prefix: "+", label: "Bonus: aciertas top-2 aunque cambies el orden", bonus: true },
    ],
  },
];
export const GROUPS_FOOTNOTE = "Hasta 13 pts por grupo · 12 grupos en juego.";

export const BRACKET_SCORING: ScoringSection[] = [
  {
    heading: "Por cada equipo correcto que avanza",
    rules: [
      { points: 2, label: "Pasa a octavos (R16)" },
      { points: 4, label: "Pasa a cuartos (QF)" },
      { points: 7, label: "Pasa a semifinales (SF)" },
      { points: 10, label: "Llega a la final" },
      { points: 20, label: "Campeón del torneo" },
    ],
  },
];
export const BRACKET_FOOTNOTE = "Cada slot acertado suma. Aciertos acumulables ronda a ronda.";

export const TOP_SCORER_SCORING: ScoringSection[] = [
  {
    rules: [
      { points: 15, label: "Tu pick es el máximo goleador del torneo" },
      { points: 5, label: "Tu pick queda 2º o 3º goleador" },
      { points: 2, label: "Tu pick termina entre los 5 primeros goleadores" },
    ],
  },
];

// ───────────── Resultado del partido · por fase (Completo + Marcador) ─────────────

/** Marcador · fase de grupos (tiers excluyentes). */
export const MATCH_GROUP_SCORING: ScoringSection = {
  heading: "Fase de grupos",
  rules: [
    { points: 5, label: "Marcador exacto", example: "Dices 2-0, queda 2-0" },
    { points: 3, label: "Ganador correcto + los goles de un equipo", example: "Dices 2-0, queda 2-1" },
    { points: 2, label: "Ganador o empate correcto, sin marcador exacto", example: "Dices 2-0, queda 3-1" },
    { points: 1, label: "Goles de un equipo, sin acertar el ganador", example: "Dices 2-1, queda 2-3" },
  ],
};

/** Marcador · fase final (incluye prórroga; empate = va a penaltis). */
export const MATCH_FINAL_SCORING: ScoringSection = {
  heading: "Fase final",
  rules: [
    { points: 7, label: "Empate exacto + aciertas quién pasa en penaltis", example: "Dices 1-1 y pasa MEX; 1-1 y pasa MEX en pens" },
    { points: 5, label: "Marcador exacto (incluye prórroga)", example: "Dices 2-1, queda 2-1" },
    { points: 4, label: "Empate (sin marcador exacto) + quién pasa en penaltis", example: "Dices 0-0 y pasa MEX; 1-1 y pasa MEX en pens" },
    { points: 3, label: "Ganador correcto + los goles de un equipo", example: "Dices 2-1, queda 2-0" },
    { points: 2, label: "Ganador/resultado correcto, sin marcador exacto", example: "Dices 2-1, queda 3-0" },
    { points: 1, label: "Goles de un equipo, sin acertar el resultado", example: "Dices 2-1, queda 2-3" },
  ],
};

/** Goleador por partido (solo modo Completo). */
export const SCORER_SCORING: ScoringSection = {
  rules: [
    { points: 4, label: "Tu jugador anota un gol en el partido" },
    { points: 2, prefix: "+", label: "Bonus si además es el primer gol del partido", bonus: true },
  ],
};

// ───────────── Solo Ganador · por fase ─────────────

export const SOLO_GROUP_SCORING: ScoringSection = {
  heading: "Fase de grupos",
  rules: [
    { points: 3, label: "Aciertas el ganador o el empate", example: "Dices que gana MEX; gana MEX" },
  ],
};

export const SOLO_FINAL_SCORING: ScoringSection = {
  heading: "Fase final",
  rules: [
    { points: 5, label: "Empate + aciertas quién pasa en penaltis", example: "Dices empate y pasa MEX; pasa MEX en pens" },
    { points: 3, label: "Aciertas ganador o empate (sin el ganador de pens)", example: "Dices que gana MEX; gana MEX" },
  ],
};

/**
 * Secciones de puntuación de PARTIDO para una fase concreta. Lo usa la página
 * de jornada (según `day.stage`) y `/puntuacion`. En Completo se añade la
 * sección de goleador.
 */
export function matchScoringSections(
  mode: "completo" | "marcador" | "solo_ganador",
  isKnockout: boolean,
): ScoringSection[] {
  if (mode === "solo_ganador") {
    return [isKnockout ? SOLO_FINAL_SCORING : SOLO_GROUP_SCORING];
  }
  const phase = isKnockout ? MATCH_FINAL_SCORING : MATCH_GROUP_SCORING;
  if (mode === "completo") {
    return [phase, { heading: "Goleador del partido", rules: SCORER_SCORING.rules }];
  }
  return [phase];
}

export const SPECIALS_SCORING: ScoringSection[] = [
  {
    rules: [
      { points: 8, label: "Balón de Oro (mejor jugador del torneo)" },
      { points: 6, label: "Guante de Oro (mejor portero del torneo)" },
      { points: 5, label: "Total de goles en fase de grupos (±5 del real)" },
      { points: 4, label: "¿África llega a semifinales?" },
      { points: 3, label: "¿Resultado con +6 goles en grupos?" },
      { points: 3, label: "Anfitrión que llega más lejos (acertando la selección)" },
      {
        points: 5,
        prefix: "+",
        label: "Anfitrión: bonus si además aciertas la ronda exacta",
        bonus: true,
      },
    ],
  },
];
export const SPECIALS_FOOTNOTE = "Cada especial tiene su propio cierre y reparto fijo.";
