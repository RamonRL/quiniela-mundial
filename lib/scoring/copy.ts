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

export const MATCH_SCORING: ScoringSection[] = [
  {
    heading: "Marcador",
    rules: [
      { points: 5, label: "Marcador exacto (en 90' o 120' en knockout)" },
      { points: 2, label: "Aciertas el ganador (o el empate) sin marcador exacto" },
    ],
  },
  {
    heading: "Goleador del partido",
    rules: [
      { points: 4, label: "Tu jugador anota un gol" },
      { points: 2, prefix: "+", label: "Bonus si además es el primer gol del partido", bonus: true },
    ],
  },
  {
    heading: "Solo en eliminatoria",
    rules: [
      { points: 3, prefix: "+", label: "Aciertas el clasificado a la siguiente ronda", bonus: true },
      { points: 2, prefix: "+", label: "Predices que va a penaltis y ocurre", bonus: true },
    ],
  },
];
export const MATCH_FOOTNOTE = "En grupos: hasta 11 pts. En knockout: hasta 16 pts por partido.";

// ───────────── Copy de partido por modo de liga ─────────────

/** Modo Marcador: solo marcador, sin la sección de goleador. */
export const MATCH_SCORING_MARCADOR: ScoringSection[] = [
  {
    heading: "Marcador",
    rules: [
      { points: 5, label: "Marcador exacto (90' o 120' en eliminatoria)" },
      { points: 2, label: "Aciertas el ganador (o el empate) sin marcador exacto" },
    ],
  },
  {
    heading: "Solo en eliminatoria",
    rules: [
      { points: 3, prefix: "+", label: "Aciertas el clasificado (quién pasa)", bonus: true },
      { points: 2, prefix: "+", label: "Predices empate→penaltis y ocurre", bonus: true },
    ],
  },
];

/** Modo Solo Ganador: solo el 1X2 / quién pasa. */
export const MATCH_SCORING_SOLO_GANADOR: ScoringSection[] = [
  {
    heading: "Ganador del partido",
    rules: [
      { points: 3, label: "Aciertas el ganador (o el empate→penaltis en eliminatoria)" },
      {
        points: 2,
        prefix: "+",
        label: "Eliminatoria: si predices empate y aciertas quién gana la tanda",
        bonus: true,
      },
    ],
  },
];

/** Mapa modo → secciones de copy para la página de jornada y /puntuacion. */
export const MATCH_SCORING_BY_MODE: Record<
  "completo" | "marcador" | "solo_ganador",
  ScoringSection[]
> = {
  completo: MATCH_SCORING,
  marcador: MATCH_SCORING_MARCADOR,
  solo_ganador: MATCH_SCORING_SOLO_GANADOR,
};

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
