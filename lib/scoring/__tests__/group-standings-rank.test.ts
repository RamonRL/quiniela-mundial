import { describe, expect, it } from "vitest";
import {
  rankGroupStandings,
  type H2HMatch,
  type StandingAgg,
} from "../group-standings-rank";

const t = (teamId: number, points: number, gf: number, ga: number): StandingAgg => ({
  teamId,
  points,
  goalsFor: gf,
  goalsAgainst: ga,
});

const order = (rows: StandingAgg[]) => rows.map((r) => r.teamId);

describe("rankGroupStandings", () => {
  it("ordena por puntos, luego DG, luego GF", () => {
    const rows = [
      t(1, 6, 4, 2), // 6 pts
      t(2, 9, 7, 1), // 9 pts
      t(3, 3, 3, 5),
      t(4, 0, 1, 7),
    ];
    expect(order(rankGroupStandings(rows, []))).toEqual([2, 1, 3, 4]);
  });

  it("desempata por diferencia de goles cuando los puntos son iguales", () => {
    const rows = [
      t(1, 6, 5, 4), // DG +1
      t(2, 6, 8, 2), // DG +6
    ];
    expect(order(rankGroupStandings(rows, []))).toEqual([2, 1]);
  });

  it("desempata por goles a favor cuando puntos y DG son iguales", () => {
    const rows = [
      t(1, 4, 3, 3), // DG 0, GF 3
      t(2, 4, 5, 5), // DG 0, GF 5
    ];
    expect(order(rankGroupStandings(rows, []))).toEqual([2, 1]);
  });

  it("aplica head-to-head cuando empatan en puntos+DG+GF (2 equipos)", () => {
    // 1 y 2 empatan a todo globalmente; el partido directo lo ganó el 2.
    const rows = [t(1, 4, 4, 4), t(2, 4, 4, 4)];
    const matches: H2HMatch[] = [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 0, awayScore: 1 },
    ];
    expect(order(rankGroupStandings(rows, matches))).toEqual([2, 1]);
  });

  it("head-to-head a 3 bandas decide por la mini-liga", () => {
    // Tres equipos empatados globalmente a 4 pts, DG 0, GF 4. En sus duelos
    // directos: 10 vence a 20 y a 30; 20 vence a 30 → orden 10, 20, 30.
    const rows = [t(30, 4, 4, 4), t(10, 4, 4, 4), t(20, 4, 4, 4)];
    const matches: H2HMatch[] = [
      { homeTeamId: 10, awayTeamId: 20, homeScore: 1, awayScore: 0 },
      { homeTeamId: 10, awayTeamId: 30, homeScore: 1, awayScore: 0 },
      { homeTeamId: 20, awayTeamId: 30, homeScore: 1, awayScore: 0 },
    ];
    expect(order(rankGroupStandings(rows, matches))).toEqual([10, 20, 30]);
  });

  it("empate irresoluble → orden determinista por teamId (no insertion order)", () => {
    // Mismos stats globales y el directo fue empate: cae al fallback teamId asc.
    const rows = [t(7, 4, 4, 4), t(3, 4, 4, 4)];
    const matches: H2HMatch[] = [
      { homeTeamId: 7, awayTeamId: 3, homeScore: 2, awayScore: 2 },
    ];
    expect(order(rankGroupStandings(rows, matches))).toEqual([3, 7]);
  });

  it("no muta el array de entrada", () => {
    const rows = [t(1, 0, 0, 0), t(2, 9, 9, 0)];
    const snapshot = order(rows);
    rankGroupStandings(rows, []);
    expect(order(rows)).toEqual(snapshot);
  });
});
