/**
 * Metadata por tier — utilidades síncronas. Vive aparte de `actions.ts`
 * porque los ficheros `"use server"` solo pueden exportar funciones async.
 */

export type PaidTier = "team-50" | "team-100" | "team-250";

export const PAID_TIERS: readonly PaidTier[] = ["team-50", "team-100", "team-250"];

export const TIER_PRICE_EUR: Record<PaidTier, number> = {
  "team-50": 19,
  "team-100": 49,
  "team-250": 99,
};

export const TIER_LABEL: Record<PaidTier, string> = {
  "team-50": "Pase Equipo",
  "team-100": "Pase Empresa",
  "team-250": "Pase Empresa Plus",
};

export const TIER_MEMBERS: Record<PaidTier, string> = {
  "team-50": "Hasta 50 miembros",
  "team-100": "Hasta 100 miembros",
  "team-250": "Hasta 250 miembros",
};

export function isPaidTier(value: string): value is PaidTier {
  return (PAID_TIERS as readonly string[]).includes(value);
}
