/**
 * Ordenación PURA de una tabla de grupo según el criterio FIFA 2026 — sin DB,
 * testeable en aislamiento.
 *
 * Orden de desempate:
 *   1. puntos · 2. diferencia de goles · 3. goles a favor (todos los partidos)
 *   Si ≥2 equipos siguen empatados, mini-liga SOLO entre ellos:
 *   4. puntos · 5. diferencia de goles · 6. goles a favor (entre las empatadas)
 *   Último recurso (FIFA: fair-play y sorteo, que no modelamos): `teamId` asc,
 *   para que el orden sea determinista y reproducible.
 */

export type StandingAgg = {
  teamId: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type H2HMatch = {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
};

const gd = (t: StandingAgg) => t.goalsFor - t.goalsAgainst;

/** Compara por los criterios globales 1-3. 0 si empatan en los tres. */
function compareOverall(a: StandingAgg, b: StandingAgg): number {
  if (b.points !== a.points) return b.points - a.points;
  if (gd(b) !== gd(a)) return gd(b) - gd(a);
  return b.goalsFor - a.goalsFor;
}

const tiedOverall = (a: StandingAgg, b: StandingAgg) => compareOverall(a, b) === 0;

/**
 * Mini-liga entre un conjunto de equipos empatados: agrega SOLO los partidos
 * disputados entre ellos y los ordena por puntos → DG → GF de esa mini-liga.
 * Como cierre determinista, `teamId` ascendente.
 */
function rankByHeadToHead(tied: StandingAgg[], matches: H2HMatch[]): StandingAgg[] {
  const ids = new Set(tied.map((t) => t.teamId));
  const mini = new Map<number, StandingAgg>(
    tied.map((t) => [t.teamId, { teamId: t.teamId, goalsFor: 0, goalsAgainst: 0, points: 0 }]),
  );

  for (const m of matches) {
    if (!ids.has(m.homeTeamId) || !ids.has(m.awayTeamId)) continue;
    const h = mini.get(m.homeTeamId)!;
    const a = mini.get(m.awayTeamId)!;
    h.goalsFor += m.homeScore;
    h.goalsAgainst += m.awayScore;
    a.goalsFor += m.awayScore;
    a.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) h.points += 3;
    else if (m.homeScore < m.awayScore) a.points += 3;
    else {
      h.points += 1;
      a.points += 1;
    }
  }

  return [...tied].sort((x, y) => {
    const mx = mini.get(x.teamId)!;
    const my = mini.get(y.teamId)!;
    const byMini = compareOverall(mx, my);
    if (byMini !== 0) return byMini;
    return x.teamId - y.teamId; // fair-play/sorteo no modelados → determinista.
  });
}

/**
 * Devuelve los equipos del grupo ordenados (1.º primero). `matches` son los
 * partidos finalizados del grupo (se filtran internamente a los relevantes
 * para cada mini-liga).
 */
export function rankGroupStandings<T extends StandingAgg>(
  teams: T[],
  matches: H2HMatch[],
): T[] {
  const sorted = [...teams].sort(compareOverall);
  const result: T[] = [];

  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && tiedOverall(sorted[i], sorted[j])) j++;
    const run = sorted.slice(i, j);
    if (run.length > 1) {
      const ranked = rankByHeadToHead(run, matches);
      // Re-mapea al tipo original (rankByHeadToHead trabaja con StandingAgg).
      const byId = new Map(run.map((r) => [r.teamId, r]));
      for (const r of ranked) result.push(byId.get(r.teamId)!);
    } else {
      result.push(run[0]);
    }
    i = j;
  }

  return result;
}
