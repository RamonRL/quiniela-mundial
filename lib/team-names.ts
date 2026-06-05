/**
 * Nombres localizados de las 48 selecciones del Mundial 2026.
 *
 * La DB (`teams.name`) es la fuente en CASTELLANO; este mapa por código
 * FIFA cubre EN/FR/PT sin tocar el schema. Úsalo en el borde de datos de
 * cada página (tras el fetch) con `localizeTeams`, o puntual con
 * `localizedTeamName` — así el render downstream no cambia.
 *
 * Puro y sin dependencias (importable desde server y client). Si un
 * código no está en el mapa (equipo nuevo), cae al nombre de la DB.
 */

type Localized = { en: string; fr: string; pt: string };

const TEAM_NAMES: Record<string, Localized> = {
  ALG: { en: "Algeria", fr: "Algérie", pt: "Argélia" },
  ARG: { en: "Argentina", fr: "Argentine", pt: "Argentina" },
  AUS: { en: "Australia", fr: "Australie", pt: "Austrália" },
  AUT: { en: "Austria", fr: "Autriche", pt: "Áustria" },
  BEL: { en: "Belgium", fr: "Belgique", pt: "Bélgica" },
  BIH: { en: "Bosnia and Herzegovina", fr: "Bosnie-Herzégovine", pt: "Bósnia e Herzegovina" },
  BRA: { en: "Brazil", fr: "Brésil", pt: "Brasil" },
  CAN: { en: "Canada", fr: "Canada", pt: "Canadá" },
  CIV: { en: "Ivory Coast", fr: "Côte d'Ivoire", pt: "Costa do Marfim" },
  COD: { en: "DR Congo", fr: "RD Congo", pt: "RD Congo" },
  COL: { en: "Colombia", fr: "Colombie", pt: "Colômbia" },
  CPV: { en: "Cape Verde", fr: "Cap-Vert", pt: "Cabo Verde" },
  CRO: { en: "Croatia", fr: "Croatie", pt: "Croácia" },
  CUW: { en: "Curaçao", fr: "Curaçao", pt: "Curaçao" },
  CZE: { en: "Czechia", fr: "République tchèque", pt: "República Checa" },
  ECU: { en: "Ecuador", fr: "Équateur", pt: "Equador" },
  EGY: { en: "Egypt", fr: "Égypte", pt: "Egito" },
  ENG: { en: "England", fr: "Angleterre", pt: "Inglaterra" },
  ESP: { en: "Spain", fr: "Espagne", pt: "Espanha" },
  FRA: { en: "France", fr: "France", pt: "França" },
  GER: { en: "Germany", fr: "Allemagne", pt: "Alemanha" },
  GHA: { en: "Ghana", fr: "Ghana", pt: "Gana" },
  HAI: { en: "Haiti", fr: "Haïti", pt: "Haiti" },
  IRN: { en: "Iran", fr: "Iran", pt: "Irã" },
  IRQ: { en: "Iraq", fr: "Irak", pt: "Iraque" },
  JOR: { en: "Jordan", fr: "Jordanie", pt: "Jordânia" },
  JPN: { en: "Japan", fr: "Japon", pt: "Japão" },
  KOR: { en: "South Korea", fr: "Corée du Sud", pt: "Coreia do Sul" },
  KSA: { en: "Saudi Arabia", fr: "Arabie saoudite", pt: "Arábia Saudita" },
  MAR: { en: "Morocco", fr: "Maroc", pt: "Marrocos" },
  MEX: { en: "Mexico", fr: "Mexique", pt: "México" },
  NED: { en: "Netherlands", fr: "Pays-Bas", pt: "Países Baixos" },
  NOR: { en: "Norway", fr: "Norvège", pt: "Noruega" },
  NZL: { en: "New Zealand", fr: "Nouvelle-Zélande", pt: "Nova Zelândia" },
  PAN: { en: "Panama", fr: "Panama", pt: "Panamá" },
  PAR: { en: "Paraguay", fr: "Paraguay", pt: "Paraguai" },
  POR: { en: "Portugal", fr: "Portugal", pt: "Portugal" },
  QAT: { en: "Qatar", fr: "Qatar", pt: "Catar" },
  RSA: { en: "South Africa", fr: "Afrique du Sud", pt: "África do Sul" },
  SCO: { en: "Scotland", fr: "Écosse", pt: "Escócia" },
  SEN: { en: "Senegal", fr: "Sénégal", pt: "Senegal" },
  SUI: { en: "Switzerland", fr: "Suisse", pt: "Suíça" },
  SWE: { en: "Sweden", fr: "Suède", pt: "Suécia" },
  TUN: { en: "Tunisia", fr: "Tunisie", pt: "Tunísia" },
  TUR: { en: "Türkiye", fr: "Turquie", pt: "Turquia" },
  URU: { en: "Uruguay", fr: "Uruguay", pt: "Uruguai" },
  USA: { en: "United States", fr: "États-Unis", pt: "Estados Unidos" },
  UZB: { en: "Uzbekistan", fr: "Ouzbékistan", pt: "Uzbequistão" },
};

/** Nombre localizado de una selección; cae al nombre ES de la DB. */
export function localizedTeamName(
  code: string | null | undefined,
  fallback: string,
  locale: string,
): string {
  if (!code || locale === "es") return fallback;
  const entry = TEAM_NAMES[code];
  if (!entry) return fallback;
  if (locale === "en" || locale === "fr" || locale === "pt") {
    return entry[locale];
  }
  return fallback;
}

/**
 * Localiza `name` en una lista de equipos (objetos con `code` y `name`)
 * justo después del fetch — el render downstream no necesita cambios.
 */
export function localizeTeams<T extends { code: string; name: string }>(
  teams: T[],
  locale: string,
): T[] {
  if (locale === "es") return teams;
  return teams.map((t) => ({
    ...t,
    name: localizedTeamName(t.code, t.name, locale),
  }));
}
