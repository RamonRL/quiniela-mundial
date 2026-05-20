/**
 * Constantes y helpers PUROS sobre los tiers de quinielas privadas.
 *
 * Vive en su propio módulo (sin imports de DB ni de `next/*`) para
 * que sea importable desde tests Vitest sin necesidad de bootstrap
 * de DATABASE_URL. La capa con efectos (count, queries) está en
 * `lib/leagues.ts`.
 */

export type LeagueTier =
  | "free"
  | "team-50"
  | "team-100"
  | "team-250"
  | "enterprise";

/**
 * Tope de miembros por defecto del plan Free. Lo usa el seed/migration
 * y también `createLeague` al insertar nuevas privadas.
 */
export const MEMBER_LIMIT_FREE = 20;

export const TIER_MEMBER_LIMIT: Record<LeagueTier, number | null> = {
  free: 20,
  "team-50": 50,
  "team-100": 100,
  "team-250": 250,
  enterprise: null, // sin tope numérico, negociado
};

export function isPremiumTier(
  tier: LeagueTier | string | null | undefined,
): boolean {
  return !!tier && tier !== "free";
}
