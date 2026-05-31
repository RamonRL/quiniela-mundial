/**
 * Metadatos puros de los modos de predicción de una liga. Sin dependencias de
 * DB para que componentes cliente y tests lo importen sin tirar de la conexión
 * (mismo patrón que `lib/league-tiers.ts`).
 */

export type PredictionMode = "completo" | "marcador" | "solo_ganador";

export const PREDICTION_MODES: readonly PredictionMode[] = [
  "completo",
  "marcador",
  "solo_ganador",
] as const;

export function isPredictionMode(value: string): value is PredictionMode {
  return (PREDICTION_MODES as readonly string[]).includes(value);
}

type ModeMeta = {
  /** Etiqueta corta (sin "Quiniela"). */
  label: string;
  /** Sufijo para el nombre de la pública: "Quiniela pública (X)". */
  publicSuffix: string;
  /** Slug de la liga pública de este modo. */
  publicSlug: string;
  /** Una frase para el selector de creación. */
  tagline: string;
  /** Explicación breve (2-3 líneas) para el selector. */
  description: string;
};

export const PREDICTION_MODE_META: Record<PredictionMode, ModeMeta> = {
  completo: {
    label: "Completo",
    publicSuffix: "Completo",
    publicSlug: "liga-principal",
    tagline: "La experiencia completa",
    description:
      "Las 6 categorías: posiciones de grupo, bracket, bota de oro, especiales, marcador y goleador de cada partido. Para quien quiere exprimir el Mundial.",
  },
  marcador: {
    label: "Marcador",
    publicSuffix: "Marcador",
    publicSlug: "quiniela-publica-marcador",
    tagline: "Solo marcadores",
    description:
      "Predice únicamente el marcador exacto de cada partido. Sencilla y directa: nada de grupos, bracket ni goleadores.",
  },
  solo_ganador: {
    label: "Solo Ganador",
    publicSuffix: "Ganador",
    publicSlug: "quiniela-publica-ganador",
    tagline: "Lo más simple",
    description:
      "Predice solo quién gana cada partido (o empate). La más rápida de rellenar: ideal para grupos grandes y gente con poco tiempo.",
  },
};

/** Slug de la liga pública → modo. Inverso de PREDICTION_MODE_META[*].publicSlug. */
export const PUBLIC_SLUG_BY_MODE: Record<PredictionMode, string> = {
  completo: PREDICTION_MODE_META.completo.publicSlug,
  marcador: PREDICTION_MODE_META.marcador.publicSlug,
  solo_ganador: PREDICTION_MODE_META.solo_ganador.publicSlug,
};
