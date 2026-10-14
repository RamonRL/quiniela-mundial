import { describe, expect, it } from "vitest";
import { scoreSpecialPrediction, type SpecialDef } from "../special";

describe("scoreSpecialPrediction", () => {
  it("yes_no awards on match", () => {
    const def: SpecialDef = {
      id: 1,
      key: "africa_in_semis",
      type: "yes_no",
      optionsJson: null,
      pointsConfigJson: { correct: 4 },
      resolvedValueJson: { value: true },
    };
    expect(
      scoreSpecialPrediction({ special: def, userValueJson: { value: true } })[0].points,
    ).toBe(4);
    expect(
      scoreSpecialPrediction({ special: def, userValueJson: { value: false } }),
    ).toHaveLength(0);
  });

  it("number_range respects tolerance", () => {
    const def: SpecialDef = {
      id: 2,
      key: "group_total_goals",
      type: "number_range",
      optionsJson: { tolerance: 5 },
      pointsConfigJson: { correct: 5 },
      resolvedValueJson: { value: 130 },
    };
    expect(
      scoreSpecialPrediction({ special: def, userValueJson: { value: 134 } })[0].points,
    ).toBe(5);
    expect(
      scoreSpecialPrediction({ special: def, userValueJson: { value: 125 } })[0].points,
    ).toBe(5);
    expect(
      scoreSpecialPrediction({ special: def, userValueJson: { value: 120 } }),
    ).toHaveLength(0);
  });

  it("team_with_round awards perRound for actual reach when team matches", () => {
    const def: SpecialDef = {
      id: 3,
      key: "host_furthest_round",
      type: "team_with_round",
      optionsJson: {
        teamCodes: ["USA", "CAN", "MEX"],
        rounds: ["group", "r32", "r16", "qf", "sf", "final", "champion"],
      },
      pointsConfigJson: {
        maxPoints: 8,
        perRound: { r32: 1, r16: 2, qf: 4, sf: 6, final: 7, champion: 8 },
      },
      resolvedValueJson: { teamCode: "USA", round: "qf" },
    };
    // User predicted USA reaches r16 → team actually reached qf → award perRound[qf] = 4
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "USA", round: "r16" },
      })[0].points,
    ).toBe(4);

    // Wrong team
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "MEX", round: "qf" },
      }),
    ).toHaveLength(0);

    // Capped at maxPoints
    const def2: SpecialDef = {
      ...def,
      resolvedValueJson: { teamCode: "USA", round: "champion" },
      pointsConfigJson: {
        maxPoints: 8,
        perRound: { r32: 1, r16: 2, qf: 4, sf: 6, final: 7, champion: 9 },
      },
    };
    expect(
      scoreSpecialPrediction({
        special: def2,
        userValueJson: { teamCode: "USA", round: "champion" },
      })[0].points,
    ).toBe(8);
  });

  it("team_with_round (new format): 3 pts por team + 5 bonus por ronda exacta", () => {
    const def: SpecialDef = {
      id: 3,
      key: "host_furthest_round",
      type: "team_with_round",
      optionsJson: {
        teamCodes: ["USA", "CAN", "MEX"],
        rounds: ["group", "r32", "r16", "qf", "sf", "final", "champion"],
      },
      pointsConfigJson: { correct: 3, exactRoundBonus: 5 },
      resolvedValueJson: { teamCode: "USA", round: "qf" },
    };

    // Acierta team Y ronda → 3 + 5 = 8.
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "USA", round: "qf" },
      })[0].points,
    ).toBe(8);

    // Acierta team pero no ronda → 3.
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "USA", round: "sf" },
      })[0].points,
    ).toBe(3);

    // Falla team → 0.
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "MEX", round: "qf" },
      }),
    ).toHaveLength(0);
  });

  it("team_with_round awards every host in a tie (teamCodes array)", () => {
    const def: SpecialDef = {
      id: 3,
      key: "host_furthest_round",
      type: "team_with_round",
      optionsJson: {
        teamCodes: ["USA", "CAN", "MEX"],
        rounds: ["group", "r32", "r16", "qf", "sf", "final", "champion"],
      },
      pointsConfigJson: { correct: 3, exactRoundBonus: 5 },
      resolvedValueJson: { teamCodes: ["USA", "CAN", "MEX"], round: "r16" },
    };

    // Los 3 empataron en octavos: cualquiera de los 3 predicciones acierta.
    for (const teamCode of ["USA", "CAN", "MEX"]) {
      expect(
        scoreSpecialPrediction({
          special: def,
          userValueJson: { teamCode, round: "r16" },
        })[0].points,
      ).toBe(8);
    }

    // Un cuarto equipo cualquiera no acierta.
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "BRA", round: "r16" },
      }),
    ).toHaveLength(0);
  });

  it("team_with_round awards a 2-way tie but not the excluded team", () => {
    const def: SpecialDef = {
      id: 3,
      key: "host_furthest_round",
      type: "team_with_round",
      optionsJson: {
        teamCodes: ["USA", "CAN", "MEX"],
        rounds: ["group", "r32", "r16", "qf", "sf", "final", "champion"],
      },
      pointsConfigJson: { correct: 3, exactRoundBonus: 5 },
      resolvedValueJson: { teamCodes: ["USA", "MEX"], round: "qf" },
    };

    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "USA", round: "qf" },
      })[0].points,
    ).toBe(8);
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "MEX", round: "qf" },
      })[0].points,
    ).toBe(8);
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "CAN", round: "qf" },
      }),
    ).toHaveLength(0);
  });

  it("team_with_round still supports the legacy singular teamCode shape", () => {
    const def: SpecialDef = {
      id: 3,
      key: "host_furthest_round",
      type: "team_with_round",
      optionsJson: {
        teamCodes: ["USA", "CAN", "MEX"],
        rounds: ["group", "r32", "r16", "qf", "sf", "final", "champion"],
      },
      pointsConfigJson: { correct: 3, exactRoundBonus: 5 },
      resolvedValueJson: { teamCode: "USA", round: "qf" },
    };

    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "USA", round: "qf" },
      })[0].points,
    ).toBe(8);
    expect(
      scoreSpecialPrediction({
        special: def,
        userValueJson: { teamCode: "MEX", round: "qf" },
      }),
    ).toHaveLength(0);
  });

  it("returns empty when not yet resolved", () => {
    const def: SpecialDef = {
      id: 4,
      key: "best_player",
      type: "player",
      optionsJson: null,
      pointsConfigJson: { correct: 8 },
      resolvedValueJson: null,
    };
    expect(
      scoreSpecialPrediction({ special: def, userValueJson: { playerId: 1 } }),
    ).toHaveLength(0);
  });
});
