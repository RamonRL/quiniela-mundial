/**
 * Resuelve la ETIQUETA explicativa de una entrada del points_ledger a partir de
 * su `source` + `sourceRef` + `points`. Devuelve una clave del namespace i18n
 * `ledger` (o null si la fuente es desconocida → el caller muestra el raw).
 *
 * El scoring de partido guarda UNA sola entrada (`match_result` / `solo_winner`)
 * con `phase` y, en el caso de marcador, `exact`. El tier concreto (exacto,
 * ganador+goles, etc.) NO se persiste, así que lo derivamos de (phase, exact,
 * points) con los puntos por defecto. Para la fase de grupos los valores son
 * distintos (5/3/2/1), así que la derivación es inequívoca.
 */

/** Fuentes que cuentan como "marcador/resultado" (vs goleador). */
export const MARKER_SOURCES = new Set(["match_result", "solo_winner", "solo_winner_pens"]);
/** Fuentes de goleador. */
export const SCORER_SOURCES = new Set(["match_scorer", "match_first_scorer"]);

type Ref = Record<string, unknown> | null | undefined;

function isExact(ref: Ref): boolean {
  const e = ref?.exact;
  return e === true || e === "true";
}

function phaseOf(ref: Ref): "group" | "ko" {
  return ref?.phase === "ko" ? "ko" : "group";
}

/**
 * Clave i18n (namespace `ledger`) para una entrada del ledger, o null si la
 * fuente no se reconoce.
 */
export function ledgerLabelKey(
  source: string,
  sourceRef: Ref,
  points: number,
): string | null {
  switch (source) {
    case "match_result": {
      const ko = phaseOf(sourceRef) === "ko";
      const exact = isExact(sourceRef);
      if (!ko) {
        if (exact) return "matchExact"; // 5
        if (points >= 3) return "outcomeTeam"; // 3
        if (points >= 2) return "outcome"; // 2
        return "goalsOneTeam"; // 1
      }
      if (exact) return points >= 7 ? "drawExactPens" : "matchExact"; // 7 / 5
      if (points >= 4) return "drawPens"; // 4
      if (points >= 3) return "outcomeTeam"; // 3
      if (points >= 2) return "outcome"; // 2
      return "goalsOneTeam"; // 1
    }
    case "solo_winner":
    case "solo_winner_pens": {
      const ko = phaseOf(sourceRef) === "ko";
      // Solo Ganador KO: 5 = empate + ganador de penaltis; 3 = ganador correcto.
      if (ko && points >= 5) return "drawPens";
      return "outcome";
    }
    case "match_scorer":
      return "scorer";
    case "match_first_scorer":
      return "firstScorer";
    case "group_position":
      return "groupPosition";
    case "group_top2_swap":
      return "groupTop2Swap";
    case "bracket_slot":
      return "bracketSlot";
    case "tournament_top_scorer":
      return "topScorer";
    case "special_prediction":
      return "special";
    default:
      return null;
  }
}
