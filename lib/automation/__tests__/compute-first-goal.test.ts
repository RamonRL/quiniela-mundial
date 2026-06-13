import { describe, expect, it } from "vitest";
import { computeFirstGoal, type MatchScorerInput } from "../first-goal";

const s = (over: Partial<MatchScorerInput>): MatchScorerInput => ({
  playerId: 1,
  teamId: 1,
  minute: null,
  isOwnGoal: false,
  isPenalty: false,
  ...over,
});

describe("computeFirstGoal", () => {
  it("marca primer gol al de menor minuto (sin autogoles)", () => {
    const r = computeFirstGoal([
      s({ playerId: 1, minute: 30 }),
      s({ playerId: 2, minute: 10 }),
      s({ playerId: 3, minute: 80 }),
    ]);
    expect(r.find((x) => x.playerId === 2)!.isFirstGoal).toBe(true);
    expect(r.filter((x) => x.isFirstGoal)).toHaveLength(1);
  });

  it("si el PRIMER gol del partido es en propia, nadie es primer goleador", () => {
    const r = computeFirstGoal([
      s({ playerId: 1, minute: 5, isOwnGoal: true }),
      s({ playerId: 2, minute: 20 }),
    ]);
    expect(r.every((x) => !x.isFirstGoal)).toBe(true);
  });

  it("autogol POSTERIOR al primer gol real → el primer gol real cuenta", () => {
    const r = computeFirstGoal([
      s({ playerId: 1, minute: 10 }),
      s({ playerId: 2, minute: 20, isOwnGoal: true }),
    ]);
    expect(r.find((x) => x.playerId === 1)!.isFirstGoal).toBe(true);
    expect(r.find((x) => x.playerId === 2)!.isFirstGoal).toBe(false);
  });

  it("autogol y gol real en el mismo minuto → el gol real cuenta", () => {
    const r = computeFirstGoal([
      s({ playerId: 1, minute: 12, isOwnGoal: true }),
      s({ playerId: 2, minute: 12 }),
    ]);
    expect(r.find((x) => x.playerId === 2)!.isFirstGoal).toBe(true);
    expect(r.filter((x) => x.isFirstGoal)).toHaveLength(1);
  });

  it("sin goles válidos, ninguno es primer gol", () => {
    const r = computeFirstGoal([s({ playerId: 1, minute: 5, isOwnGoal: true })]);
    expect(r.every((x) => !x.isFirstGoal)).toBe(true);
  });

  it("lista vacía → vacía", () => {
    expect(computeFirstGoal([])).toEqual([]);
  });
});
