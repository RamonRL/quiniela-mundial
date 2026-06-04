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

/** Etiqueta legible de cada plan/tier (para admin, Telegram, etc.). */
export const TIER_LABEL: Record<LeagueTier, string> = {
  free: "Free",
  "team-50": "Pase Equipo",
  "team-100": "Pase Empresa",
  "team-250": "Pase Empresa Plus",
  enterprise: "Enterprise",
};

export function isPremiumTier(
  tier: LeagueTier | string | null | undefined,
): boolean {
  return !!tier && tier !== "free";
}

/**
 * Tiers que desbloquean la feature "Departamentos". Hoy son todos los
 * planes de pago (50/100/250/enterprise). Aislado en una constante por
 * si en el futuro restringimos la feature a tiers concretos.
 */
export const DEPARTMENTS_ENABLED_TIERS: readonly LeagueTier[] = [
  "team-50",
  "team-100",
  "team-250",
  "enterprise",
];

export function canUseDepartments(
  tier: LeagueTier | string | null | undefined,
): boolean {
  return !!tier && DEPARTMENTS_ENABLED_TIERS.includes(tier as LeagueTier);
}

/**
 * Tiers que desbloquean el BRANDING personalizado (tab Branding: logo cuadrado
 * con cropper + marca que sustituye el wordmark QM en el shell). Solo a partir
 * del Pase Empresa (100). El team-50 ve INFO y FUNCIONALIDADES.
 */
export const BRANDING_ENABLED_TIERS: readonly LeagueTier[] = [
  "team-100",
  "team-250",
  "enterprise",
];

export function canUseBranding(
  tier: LeagueTier | string | null | undefined,
): boolean {
  return !!tier && BRANDING_ENABLED_TIERS.includes(tier as LeagueTier);
}
