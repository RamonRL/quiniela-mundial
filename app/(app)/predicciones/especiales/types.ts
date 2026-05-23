export type SpecialType =
  | "yes_no"
  | "single_choice"
  | "team_with_round"
  | "number_range"
  | "player";

export type SpecialDef = {
  id: number;
  key: string;
  question: string;
  type: SpecialType;
  optionsJson: unknown;
  pointsConfigJson: unknown;
  closesAt: string;
};

export function isSpecialAnswered(
  v: Record<string, unknown> | undefined,
  type: SpecialType,
): boolean {
  if (!v) return false;
  if (type === "yes_no" || type === "single_choice" || type === "number_range") {
    return v.value !== undefined && v.value !== null && v.value !== "";
  }
  if (type === "team_with_round") {
    return Boolean(v.teamCode) && Boolean(v.round);
  }
  if (type === "player") {
    return v.playerId !== undefined && v.playerId !== null;
  }
  return false;
}
