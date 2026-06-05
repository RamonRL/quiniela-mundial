/**
 * Nombres localizados de jornadas/rondas del torneo.
 *
 * `matchdays.name` vive en DB en CASTELLANO ("Fase de grupos · Jornada 1",
 * "Dieciseisavos (R32)", …). Este helper traduce por `stage` (+ número de
 * jornada parseado del nombre para la fase de grupos), con fallback al
 * nombre de la DB. Puro y sin dependencias — usable en server y client.
 */

export type MatchdayStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final";

type Localized = { en: string; fr: string; pt: string };

const STAGE_NAMES: Record<Exclude<MatchdayStage, "group">, Localized> = {
  r32: { en: "Round of 32", fr: "Seizièmes de finale", pt: "Dezesseis avos de final" },
  r16: { en: "Round of 16", fr: "Huitièmes de finale", pt: "Oitavas de final" },
  qf: { en: "Quarter-finals", fr: "Quarts de finale", pt: "Quartas de final" },
  sf: { en: "Semi-finals", fr: "Demi-finales", pt: "Semifinais" },
  third: { en: "Third place", fr: "Match pour la 3e place", pt: "Terceiro lugar" },
  final: { en: "Final", fr: "Finale", pt: "Final" },
};

const GROUP_STAGE: Record<"en" | "fr" | "pt", (n: string) => string> = {
  en: (n) => `Group stage · Matchday ${n}`,
  fr: (n) => `Phase de groupes · Journée ${n}`,
  pt: (n) => `Fase de grupos · Rodada ${n}`,
};

const GROUP_LABEL: Localized = {
  en: "Group stage",
  fr: "Phase de groupes",
  pt: "Fase de grupos",
};

/**
 * Etiqueta corta de una fase SIN número de jornada ("Fase de grupos",
 * "Octavos de final"…). Para las cards de partido en equipos/sedes.
 * `fallback` es la etiqueta ES ya renderizada hoy.
 */
export function localizedStageLabel(
  stage: string | null | undefined,
  fallback: string,
  locale: string,
): string {
  if (locale === "es" || (locale !== "en" && locale !== "fr" && locale !== "pt")) {
    return fallback;
  }
  if (stage === "group") return GROUP_LABEL[locale];
  const entry = STAGE_NAMES[stage as Exclude<MatchdayStage, "group">];
  return entry?.[locale] ?? fallback;
}

/**
 * Localiza el nombre de una jornada. `stage` puede venir null en datos
 * antiguos — en ese caso intenta deducirlo del propio nombre ES.
 */
export function localizedMatchdayName(
  name: string,
  stage: string | null | undefined,
  locale: string,
): string {
  if (locale === "es") return name;
  if (locale !== "en" && locale !== "fr" && locale !== "pt") return name;

  let st = stage as MatchdayStage | null | undefined;
  if (!st) {
    // Datos sin stage: deducir del nombre castellano conocido.
    if (/fase de grupos/i.test(name)) st = "group";
    else if (/dieciseisavos/i.test(name)) st = "r32";
    else if (/octavos/i.test(name)) st = "r16";
    else if (/cuartos/i.test(name)) st = "qf";
    else if (/semifinal/i.test(name)) st = "sf";
    else if (/tercer puesto/i.test(name)) st = "third";
    else if (/^final$/i.test(name.trim())) st = "final";
  }
  if (!st) return name;

  if (st === "group") {
    const n = name.match(/(\d+)\s*$/)?.[1];
    return n ? GROUP_STAGE[locale](n) : GROUP_STAGE[locale]("1");
  }
  return STAGE_NAMES[st]?.[locale] ?? name;
}
