import { describe, expect, it } from "vitest";
import { scoreSoloGanadorPrediction } from "../solo-ganador";
import type { MatchOutcome, MatchResultPrediction } from "../match";
import { DEFAULT_SCORING_RULES } from "../defaults";
import type { ScoringRules } from "../types";

const rules = DEFAULT_SCORING_RULES as ScoringRules;

// Codificación canónica del 1X2: local 1-0 · empate 0-0 · visitante 0-1.
const pred = (
  home: number,
  away: number,
  extra: Partial<MatchResultPrediction> = {},
): MatchResultPrediction => ({
  matchId: 1,
  homeScore: home,
  awayScore: away,
  willGoToPens: home === away,
  winnerTeamId: null,
  ...extra,
});

describe("scoreSoloGanadorPrediction · fase de grupos", () => {
  const groupMatch: MatchOutcome = {
    matchId: 1,
    stage: "group",
    homeScore: 3,
    awayScore: 1, // gana local
    wentToPens: false,
    winnerTeamId: null,
    scorers: [],
  };

  it("acierta el ganador local → 3", () => {
    const e = scoreSoloGanadorPrediction({ match: groupMatch, prediction: pred(1, 0), rules });
    expect(e).toHaveLength(1);
    expect(e[0].source).toBe("solo_winner");
    expect(e[0].points).toBe(3);
  });

  it("predijo visitante, ganó local → 0", () => {
    const e = scoreSoloGanadorPrediction({ match: groupMatch, prediction: pred(0, 1), rules });
    expect(e).toHaveLength(0);
  });

  it("acierta el empate → 3 (sin bonus pens en grupos)", () => {
    const drawMatch: MatchOutcome = { ...groupMatch, homeScore: 1, awayScore: 1 };
    const e = scoreSoloGanadorPrediction({ match: drawMatch, prediction: pred(0, 0), rules });
    expect(e).toHaveLength(1);
    expect(e[0].source).toBe("solo_winner");
  });
});

describe("scoreSoloGanadorPrediction · eliminatoria", () => {
  // KO decidido en 120' (sin pens): gana local.
  const koDecisive: MatchOutcome = {
    matchId: 1,
    stage: "qf",
    homeScore: 2,
    awayScore: 0,
    wentToPens: false,
    winnerTeamId: 10,
    scorers: [],
  };
  // KO empatado en 120' → pens, pasa el visitante (teamId 20).
  const koPens: MatchOutcome = {
    matchId: 1,
    stage: "qf",
    homeScore: 1,
    awayScore: 1,
    wentToPens: true,
    winnerTeamId: 20,
    scorers: [],
  };

  it("predice ganador en 120' y acierta → 3", () => {
    const e = scoreSoloGanadorPrediction({ match: koDecisive, prediction: pred(1, 0), rules });
    expect(e.map((x) => x.source)).toEqual(["solo_winner"]);
    expect(e[0].points).toBe(3);
  });

  it("predice ganador decisivo pero el partido va a pens → 0", () => {
    const e = scoreSoloGanadorPrediction({ match: koPens, prediction: pred(1, 0), rules });
    expect(e).toHaveLength(0);
  });

  it("predice empate→pens y acierta el ganador de la tanda → 5 (una entrada)", () => {
    const e = scoreSoloGanadorPrediction({
      match: koPens,
      prediction: pred(0, 0, { willGoToPens: true, winnerTeamId: 20 }),
      rules,
    });
    expect(e.map((x) => x.source)).toEqual(["solo_winner"]);
    expect(e[0].points).toBe(5);
  });

  it("predice empate→pens pero falla el ganador de la tanda → 3", () => {
    const e = scoreSoloGanadorPrediction({
      match: koPens,
      prediction: pred(0, 0, { willGoToPens: true, winnerTeamId: 10 }),
      rules,
    });
    expect(e.map((x) => x.source)).toEqual(["solo_winner"]);
    expect(e[0].points).toBe(3);
  });
});
