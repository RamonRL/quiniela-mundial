import type { LedgerEntry } from "./types";

/**
 * Special predictions (categoría 6). Each special has a `type` that determines
 * how the user input and the resolved value are compared.
 */

export type SpecialType =
  | "yes_no"
  | "single_choice"
  | "team_with_round"
  | "number_range"
  | "player";

export type SpecialDef = {
  id: number;
  key: string;
  type: SpecialType;
  optionsJson: unknown;
  pointsConfigJson: unknown;
  resolvedValueJson: unknown;
};

const ROUNDS_RANK: Record<string, number> = {
  group: 0,
  r32: 1,
  r16: 2,
  qf: 3,
  sf: 4,
  final: 5,
  champion: 6,
};

export function scoreSpecialPrediction(args: {
  special: SpecialDef;
  userValueJson: unknown;
}): LedgerEntry[] {
  const { special, userValueJson } = args;
  if (special.resolvedValueJson == null || userValueJson == null) return [];

  const sourceKey = `special:${special.id}`;

  switch (special.type) {
    case "yes_no": {
      const cfg = special.pointsConfigJson as { correct: number };
      const resolved = (special.resolvedValueJson as { value: boolean }).value;
      const user = (userValueJson as { value: boolean }).value;
      if (resolved === user) {
        return [pt(special, sourceKey, cfg.correct)];
      }
      return [];
    }
    case "single_choice": {
      const cfg = special.pointsConfigJson as { correct: number };
      const resolved = (special.resolvedValueJson as { value: string | number }).value;
      const user = (userValueJson as { value: string | number }).value;
      if (resolved === user) {
        return [pt(special, sourceKey, cfg.correct)];
      }
      return [];
    }
    case "number_range": {
      const cfg = special.pointsConfigJson as { correct: number };
      const tolerance = (special.optionsJson as { tolerance: number }).tolerance ?? 0;
      const resolved = (special.resolvedValueJson as { value: number }).value;
      const user = (userValueJson as { value: number }).value;
      if (Math.abs(resolved - user) <= tolerance) {
        return [pt(special, sourceKey, cfg.correct)];
      }
      return [];
    }
    case "team_with_round": {
      // Dos formatos de pointsConfigJson, en orden de prioridad:
      //   1. Nuevo (host_furthest_round): { correct: number, exactRoundBonus: number }
      //      → 3 pts por acertar el equipo, +5 si además aciertas la ronda exacta.
      //   2. Legacy: { maxPoints: number, perRound: Record<round, number> }
      //      → puntos según ronda alcanzada por el equipo, capped en maxPoints.
      const resolved = special.resolvedValueJson as
        | { teamCodes: string[]; round: string }
        | { teamCode: string; round: string };
      const resolvedCodes =
        "teamCodes" in resolved ? resolved.teamCodes : [resolved.teamCode];
      const user = userValueJson as { teamCode: string; round: string };
      if (!resolvedCodes.includes(user.teamCode)) return [];

      const cfg = special.pointsConfigJson as
        | { correct: number; exactRoundBonus?: number }
        | { maxPoints: number; perRound: Record<string, number> };

      if ("correct" in cfg) {
        let awarded = cfg.correct;
        if (cfg.exactRoundBonus && user.round === resolved.round) {
          awarded += cfg.exactRoundBonus;
        }
        return awarded > 0 ? [pt(special, sourceKey, awarded)] : [];
      }

      const userRoundRank = ROUNDS_RANK[user.round] ?? -1;
      const resolvedRoundRank = ROUNDS_RANK[resolved.round] ?? -1;
      const reachedKey = resolved.round;
      const fullPoints = cfg.perRound[reachedKey] ?? 0;
      let awarded: number;
      if (userRoundRank <= resolvedRoundRank) {
        awarded = fullPoints;
      } else {
        awarded = cfg.perRound[reachedKey] ?? 0;
      }
      const final = Math.min(awarded, cfg.maxPoints);
      return final > 0 ? [pt(special, sourceKey, final)] : [];
    }
    case "player": {
      const cfg = special.pointsConfigJson as { correct: number };
      const resolved = (special.resolvedValueJson as { playerId: number }).playerId;
      const user = (userValueJson as { playerId: number }).playerId;
      if (resolved === user) return [pt(special, sourceKey, cfg.correct)];
      return [];
    }
  }
}

function pt(special: SpecialDef, sourceKey: string, points: number): LedgerEntry {
  return {
    source: "special_prediction",
    sourceKey,
    sourceRef: { specialId: special.id, key: special.key },
    points,
  };
}
