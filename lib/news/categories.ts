/**
 * Metadata estática por categoría de noticia. Sirve para:
 * - Render del chip/badge en cards.
 * - `<h1>` y meta description de la landing /noticias/categoria/<slug>.
 * - Mapeo a `articleSection` de JSON-LD NewsArticle.
 *
 * Las descripciones SEO están escritas para responder a la intención de
 * búsqueda — por ejemplo, alguien que busca "convocatoria España mundial"
 * quiere ver listas, fechas y dorsales. Las usamos como copy bajo el h1
 * de la página de categoría.
 */
export type NewsCategoryKey =
  | "convocatoria"
  | "previa"
  | "cronica"
  | "analisis"
  | "lesion"
  | "sorteo"
  | "destacada";

export type NewsCategoryMeta = {
  key: NewsCategoryKey;
  label: string;
  pluralLabel: string;
  seoH1: string;
  seoIntro: string;
  // Color para el badge — variable de Tailwind del theme arena/pitch.
  tone: "arena" | "pitch" | "amber" | "ink";
};

export const NEWS_CATEGORIES: Record<NewsCategoryKey, NewsCategoryMeta> = {
  convocatoria: {
    key: "convocatoria",
    label: "Convocatoria",
    pluralLabel: "Convocatorias",
    seoH1: "Convocatorias del Mundial 2026",
    seoIntro:
      "Listas oficiales de las 48 selecciones clasificadas: jugadores convocados, dorsales, capitanes y bajas confirmadas para la Copa Mundial 2026 en USA, Canadá y México.",
    tone: "arena",
  },
  previa: {
    key: "previa",
    label: "Previa",
    pluralLabel: "Previas",
    seoH1: "Previas de partidos del Mundial 2026",
    seoIntro:
      "Análisis previo de cada partido: alineaciones probables, antecedentes, claves tácticas y predicciones de los enfrentamientos del Mundial 2026.",
    tone: "pitch",
  },
  cronica: {
    key: "cronica",
    label: "Crónica",
    pluralLabel: "Crónicas",
    seoH1: "Crónicas y resultados del Mundial 2026",
    seoIntro:
      "Crónicas partido a partido del Mundial 2026: resultados, goles, momentos decisivos y reacciones inmediatas.",
    tone: "ink",
  },
  analisis: {
    key: "analisis",
    label: "Análisis",
    pluralLabel: "Análisis",
    seoH1: "Análisis del Mundial 2026",
    seoIntro:
      "Lectura en profundidad del torneo: claves tácticas, datos, comparativas y las historias detrás de cada selección y jugador.",
    tone: "amber",
  },
  lesion: {
    key: "lesion",
    label: "Lesión",
    pluralLabel: "Lesiones y bajas",
    seoH1: "Lesiones y bajas del Mundial 2026",
    seoIntro:
      "Última hora sobre lesiones, bajas y sustituciones en las plantillas del Mundial 2026 — qué jugadores se pierden el torneo y cómo afecta a cada selección.",
    tone: "arena",
  },
  sorteo: {
    key: "sorteo",
    label: "Sorteo",
    pluralLabel: "Sorteo",
    seoH1: "Sorteo del Mundial 2026",
    seoIntro:
      "Todo sobre el sorteo del Mundial 2026: bombos, criterios geográficos, los 12 grupos formados y los cruces que dejaron.",
    tone: "amber",
  },
  destacada: {
    key: "destacada",
    label: "Destacada",
    pluralLabel: "Destacadas",
    seoH1: "Noticias destacadas del Mundial 2026",
    seoIntro:
      "Las historias más importantes del Mundial 2026 — récords, estrellas, escándalos y todo lo que está marcando la primera edición a 48 selecciones.",
    tone: "ink",
  },
};

export const NEWS_CATEGORY_KEYS = Object.keys(NEWS_CATEGORIES) as NewsCategoryKey[];

export function getCategoryMeta(key: string): NewsCategoryMeta | null {
  return (NEWS_CATEGORIES as Record<string, NewsCategoryMeta>)[key] ?? null;
}
