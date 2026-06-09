/**
 * Lógica PURA de los mejores terceros del Mundial 2026 (sin DB) — testeable.
 *
 * 1. Rankea los terceros por el criterio FIFA que SÍ modelamos:
 *    puntos → diferencia de goles → goles a favor. (Los criterios 4 y 5 de FIFA
 *    —fair-play por tarjetas y ranking FIFA— no se modelan; si un empate cae
 *    justo en el corte 8.º/9.º, se marca `ambiguousCut` para resolución manual.)
 * 2. Si se conocen los 12 terceros y el corte NO es ambiguo, calcula la
 *    asignación oficial de casillas del R32 vía la tabla del Anexo C
 *    (`ANNEX_C`), que depende SOLO del conjunto de 8 grupos clasificados.
 */
import { ANNEX_C, ANNEX_C_WINNER_COLUMNS } from "./annex-c-data";

/** Grupo (ganador) → código del partido R32 cuya casilla away es un tercero. */
export const WINNER_TO_R32_MATCH: Record<string, string> = {
  A: "M79",
  B: "M85",
  D: "M81",
  E: "M74",
  G: "M82",
  I: "M77",
  K: "M87",
  L: "M80",
};

export type ThirdPlaceTeam = {
  group: string; // "A".."L"
  teamId: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type RankedThird = ThirdPlaceTeam & {
  rank: number;
  goalDiff: number;
  qualifies: boolean;
};

export type ThirdPlaceResult = {
  /** Los terceros ordenados (mejor primero), con rank y si clasificarían. */
  ranked: RankedThird[];
  /** ¿Hay 12 terceros (toda la fase de grupos cerrada)? */
  complete: boolean;
  /** Empate a pts/DG/GF justo en la frontera 8.º vs 9.º → corte indecidible. */
  ambiguousCut: boolean;
  /** Los 8 grupos clasificados, en orden alfabético, si es resoluble; si no, null. */
  qualifiedGroups: string[] | null;
  /**
   * Asignación de casillas: code de partido R32 → grupo del tercero que la
   * ocupa (su lado away). null si no es resoluble (faltan terceros o empate).
   */
  allocation: Record<string, string> | null;
};

const gd = (t: ThirdPlaceTeam) => t.goalsFor - t.goalsAgainst;

function compareThirds(a: ThirdPlaceTeam, b: ThirdPlaceTeam): number {
  if (b.points !== a.points) return b.points - a.points;
  if (gd(b) !== gd(a)) return gd(b) - gd(a);
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.group.localeCompare(b.group); // determinista entre verdaderos empates.
}

const sameRank = (a: ThirdPlaceTeam, b: ThirdPlaceTeam) =>
  a.points === b.points && gd(a) === gd(b) && a.goalsFor === b.goalsFor;

/**
 * `thirds` puede tener entre 0 y 12 equipos (uno por grupo cerrado). La
 * asignación de casillas solo se calcula con los 12 y sin empate en el corte.
 */
export function resolveThirdPlaces(thirds: ThirdPlaceTeam[]): ThirdPlaceResult {
  const sorted = [...thirds].sort(compareThirds);
  const ranked: RankedThird[] = sorted.map((t, i) => ({
    ...t,
    rank: i + 1,
    goalDiff: gd(t),
    qualifies: i < 8,
  }));

  const complete = thirds.length === 12;
  // El corte es ambiguo si el 8.º y el 9.º empatan en pts/DG/GF: no podemos
  // decidir qué grupo entra sin los criterios FIFA 4-5.
  const ambiguousCut =
    complete && sorted.length >= 9 && sameRank(sorted[7], sorted[8]);

  let qualifiedGroups: string[] | null = null;
  let allocation: Record<string, string> | null = null;

  if (complete && !ambiguousCut) {
    qualifiedGroups = sorted
      .slice(0, 8)
      .map((t) => t.group)
      .sort();
    const key = qualifiedGroups.join("");
    const assigns = ANNEX_C[key];
    if (assigns) {
      allocation = {};
      ANNEX_C_WINNER_COLUMNS.forEach((winner, i) => {
        const matchCode = WINNER_TO_R32_MATCH[winner];
        allocation![matchCode] = assigns[i];
      });
    }
  }

  return { ranked, complete, ambiguousCut, qualifiedGroups, allocation };
}
