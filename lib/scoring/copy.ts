import type { ScoringSection } from "@/components/brand/scoring-box";

/**
 * Copy de las reglas de puntuación de cada categoría, en paralelo a
 * `lib/scoring/defaults.ts`. Centralizado aquí para que las cards del hub y
 * las páginas de detalle muestren exactamente los mismos números y etiquetas.
 *
 * Localizado vía next-intl: cada builder recibe un traductor `t` con el
 * namespace "scoring" (de `getTranslations("scoring")` o `useTranslations`).
 * Los puntos NO se traducen; solo las etiquetas, ejemplos y encabezados.
 * Si cambia una regla en `defaults.ts`, actualízala aquí también.
 */

type T = (key: string) => string;

export function groupsScoring(t: T): ScoringSection[] {
  return [
    {
      rules: [
        { points: 3, label: t("groupsExact") },
        { points: 1, label: t("groupsOff1") },
        { points: 1, prefix: "+", label: t("groupsTop2Bonus"), bonus: true },
      ],
    },
  ];
}
export const groupsFootnote = (t: T) => t("groupsFootnote");

export function bracketScoring(t: T): ScoringSection[] {
  return [
    {
      heading: t("bracketHeading"),
      rules: [
        { points: 2, label: t("bracketR16") },
        { points: 4, label: t("bracketQf") },
        { points: 7, label: t("bracketSf") },
        { points: 10, label: t("bracketFinal") },
        { points: 20, label: t("bracketChampion") },
      ],
    },
  ];
}
export const bracketFootnote = (t: T) => t("bracketFootnote");

export function topScorerScoring(t: T): ScoringSection[] {
  return [
    {
      rules: [
        { points: 15, label: t("topScorerFirst") },
        { points: 5, label: t("topScorerSecond") },
        { points: 2, label: t("topScorerTop5") },
      ],
    },
  ];
}

// ───────────── Resultado del partido · por fase (Completo + Marcador) ─────────────

/** Marcador · fase de grupos (tiers excluyentes). */
export function matchGroupScoring(t: T): ScoringSection {
  return {
    heading: t("phaseGroups"),
    rules: [
      { points: 5, label: t("mgExactLabel"), example: t("mgExactEx") },
      { points: 3, label: t("mgOutcomeTeamLabel"), example: t("mgOutcomeTeamEx") },
      { points: 2, label: t("mgOutcomeLabel"), example: t("mgOutcomeEx") },
      { points: 1, label: t("mgTeamLabel"), example: t("mgTeamEx") },
    ],
  };
}

/** Marcador · fase final (incluye prórroga; empate = va a penaltis). */
export function matchFinalScoring(t: T): ScoringSection {
  return {
    heading: t("phaseFinal"),
    rules: [
      { points: 7, label: t("mfDrawExactPensLabel"), example: t("mfDrawExactPensEx") },
      { points: 5, label: t("mfExactLabel"), example: t("mfExactEx") },
      { points: 4, label: t("mfDrawPensLabel"), example: t("mfDrawPensEx") },
      { points: 3, label: t("mfOutcomeTeamLabel"), example: t("mfOutcomeTeamEx") },
      { points: 2, label: t("mfOutcomeLabel"), example: t("mfOutcomeEx") },
      { points: 1, label: t("mfTeamLabel"), example: t("mfTeamEx") },
    ],
  };
}

/** Goleador por partido (solo modo Completo). */
export function scorerScoring(t: T): ScoringSection {
  return {
    rules: [
      { points: 4, label: t("scorerGoal") },
      { points: 2, prefix: "+", label: t("scorerFirstBonus"), bonus: true },
    ],
  };
}

// ───────────── Solo Ganador · por fase ─────────────

export function soloGroupScoring(t: T): ScoringSection {
  return {
    heading: t("phaseGroups"),
    rules: [
      { points: 3, label: t("soloGroupCorrect"), example: t("soloGroupCorrectEx") },
    ],
  };
}

export function soloFinalScoring(t: T): ScoringSection {
  return {
    heading: t("phaseFinal"),
    rules: [
      { points: 5, label: t("soloFinalDrawPensLabel"), example: t("soloFinalDrawPensEx") },
      { points: 3, label: t("soloFinalCorrectLabel"), example: t("soloFinalCorrectEx") },
    ],
  };
}

/**
 * Secciones de puntuación de PARTIDO para una fase concreta. Lo usa la página
 * de jornada (según `day.stage`) y `/puntuacion`. En Completo se añade la
 * sección de goleador.
 */
export function matchScoringSections(
  t: T,
  mode: "completo" | "marcador" | "solo_ganador",
  isKnockout: boolean,
): ScoringSection[] {
  if (mode === "solo_ganador") {
    return [isKnockout ? soloFinalScoring(t) : soloGroupScoring(t)];
  }
  const phase = isKnockout ? matchFinalScoring(t) : matchGroupScoring(t);
  if (mode === "completo") {
    return [phase, { heading: t("matchScorerHeading"), rules: scorerScoring(t).rules }];
  }
  return [phase];
}

export function specialsScoring(t: T): ScoringSection[] {
  return [
    {
      rules: [
        { points: 8, label: t("specialsBallon") },
        { points: 6, label: t("specialsGlove") },
        { points: 5, label: t("specialsGroupGoals") },
        { points: 4, label: t("specialsAfricaSemis") },
        { points: 3, label: t("specialsSixGoals") },
        { points: 3, label: t("specialsHost") },
        { points: 5, prefix: "+", label: t("specialsHostBonus"), bonus: true },
      ],
    },
  ];
}
export const specialsFootnote = (t: T) => t("specialsFootnote");
