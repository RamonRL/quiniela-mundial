import type { DEFAULT_SCORING_RULES } from "./defaults";

export type ScoringRuleKey = keyof typeof DEFAULT_SCORING_RULES;

export type ScoringRules = Record<ScoringRuleKey, { points: number; description?: string }>;

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type LedgerEntry = {
  source:
    | "group_position"
    | "group_top2_swap"
    | "bracket_slot"
    | "tournament_top_scorer"
    | "match_exact_score"
    | "match_outcome"
    | "knockout_qualifier"
    | "knockout_pens_bonus"
    | "knockout_score_90"
    | "match_scorer"
    | "match_first_scorer"
    | "special_prediction"
    | "solo_winner"
    | "solo_winner_pens";
  /** Stable string used together with `userId` to upsert ledger rows idempotently. */
  sourceKey: string;
  sourceRef: Record<string, unknown>;
  points: number;
};
