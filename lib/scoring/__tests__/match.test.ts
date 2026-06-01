import { describe, expect, it } from "vitest";
import {
  scoreMatchResultPrediction,
  scoreMatchScorerPrediction,
  type MatchOutcome,
  type MatchResultPrediction,
} from "../match";
import { DEFAULT_SCORING_RULES } from "../defaults";
import type { ScoringRules } from "../types";

const rules = DEFAULT_SCORING_RULES as ScoringRules;

function pred(homeScore: number, awayScore: number, extra?: Partial<MatchResultPrediction>): MatchResultPrediction {
  return { matchId: 1, homeScore, awayScore, willGoToPens: false, winnerTeamId: null, ...extra };
}

function score(match: MatchOutcome, prediction: MatchResultPrediction) {
  return scoreMatchResultPrediction({ match, prediction, rules });
}

// Actual: local gana 2-1 en grupos.
const group21: MatchOutcome = {
  matchId: 1,
  stage: "group",
  homeScore: 2,
  awayScore: 1,
  wentToPens: false,
  winnerTeamId: 10,
  scorers: [],
};

describe("scoreMatchResultPrediction · fase de grupos", () => {
  it("5 pts por marcador exacto (una entrada match_result, exact=true)", () => {
    const e = score(group21, pred(2, 1));
    expect(e).toHaveLength(1);
    expect(e[0].source).toBe("match_result");
    expect(e[0].points).toBe(5);
    expect(e[0].sourceRef).toMatchObject({ phase: "group", exact: true });
  });

  it("3 pts por ganador correcto + goles de un equipo", () => {
    // 2-0: gana local (ok) y goles del local (2) exactos.
    const e = score(group21, pred(2, 0));
    expect(e[0].points).toBe(3);
    expect(e[0].sourceRef).toMatchObject({ exact: false });
  });

  it("2 pts por ganador correcto sin marcador ni goles de un equipo", () => {
    const e = score(group21, pred(3, 0)); // gana local, ningún goleo coincide
    expect(e[0].points).toBe(2);
  });

  it("1 pt por goles de un equipo sin acertar el ganador", () => {
    const e = score(group21, pred(0, 1)); // away=1 coincide; predijo visitante, ganó local
    expect(e[0].points).toBe(1);
  });

  it("0 pts (sin entrada) si falla todo", () => {
    const e = score(group21, pred(0, 3));
    expect(e).toHaveLength(0);
  });
});

describe("scoreMatchResultPrediction · fase final (empate→pens)", () => {
  // Actual: 1-1 y pasa el equipo 20 en penaltis.
  const koDraw: MatchOutcome = {
    matchId: 1,
    stage: "r16",
    homeScore: 1,
    awayScore: 1,
    wentToPens: true,
    winnerTeamId: 20,
    scorers: [],
  };

  it("7 pts: empate exacto + ganador de pens correcto", () => {
    const e = score(koDraw, pred(1, 1, { willGoToPens: true, winnerTeamId: 20 }));
    expect(e[0].points).toBe(7);
    expect(e[0].sourceRef).toMatchObject({ phase: "ko", exact: true });
  });

  it("5 pts: marcador exacto pero ganador de pens incorrecto", () => {
    const e = score(koDraw, pred(1, 1, { willGoToPens: true, winnerTeamId: 21 }));
    expect(e[0].points).toBe(5);
  });

  it("4 pts: empate no exacto + ganador de pens correcto", () => {
    const e = score(koDraw, pred(0, 0, { willGoToPens: true, winnerTeamId: 20 }));
    expect(e[0].points).toBe(4);
  });
});

describe("scoreMatchResultPrediction · fase final (decisivo)", () => {
  // Actual: local gana 2-0 en 120' (sin pens).
  const koDecisive: MatchOutcome = {
    matchId: 1,
    stage: "qf",
    homeScore: 2,
    awayScore: 0,
    wentToPens: false,
    winnerTeamId: 10,
    scorers: [],
  };

  it("5 pts por marcador exacto", () => {
    expect(score(koDecisive, pred(2, 0))[0].points).toBe(5);
  });

  it("3 pts por ganador correcto + goles de un equipo", () => {
    expect(score(koDecisive, pred(2, 1))[0].points).toBe(3);
  });

  it("2 pts por ganador correcto sin más", () => {
    expect(score(koDecisive, pred(3, 1))[0].points).toBe(2);
  });

  it("1 pt por goles de un equipo sin acertar el resultado", () => {
    // local=2 coincide, pero predijo empate y ganó el local.
    expect(score(koDecisive, pred(2, 2))[0].points).toBe(1);
  });
});

describe("scoreMatchScorerPrediction", () => {
  const match: MatchOutcome = {
    matchId: 3,
    stage: "group",
    homeScore: 3,
    awayScore: 0,
    wentToPens: false,
    winnerTeamId: 30,
    scorers: [
      { playerId: 100, teamId: 30, isFirstGoal: true },
      { playerId: 101, teamId: 30, isFirstGoal: false },
      { playerId: 102, teamId: 30, isFirstGoal: false },
    ],
  };

  it("awards 4 pts when player scored", () => {
    const entries = scoreMatchScorerPrediction({
      match,
      prediction: { matchId: 3, playerId: 101 },
      rules,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("match_scorer");
    expect(entries[0].points).toBe(4);
  });

  it("awards 4 + 2 = 6 pts when player scored first", () => {
    const entries = scoreMatchScorerPrediction({
      match,
      prediction: { matchId: 3, playerId: 100 },
      rules,
    });
    expect(entries).toHaveLength(2);
    const total = entries.reduce((s, e) => s + e.points, 0);
    expect(total).toBe(6);
  });

  it("awards 0 when player did not score", () => {
    const entries = scoreMatchScorerPrediction({
      match,
      prediction: { matchId: 3, playerId: 999 },
      rules,
    });
    expect(entries).toHaveLength(0);
  });
});
