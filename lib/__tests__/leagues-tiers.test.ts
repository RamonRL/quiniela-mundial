import { describe, expect, it } from "vitest";
import {
  MEMBER_LIMIT_FREE,
  TIER_MEMBER_LIMIT,
  isPremiumTier,
  type LeagueTier,
} from "../league-tiers";
import {
  DEFAULT_PRESET_LOGO_URL,
  PRESET_LEAGUE_LOGOS,
  isPresetLogoUrl,
  presetUrlById,
} from "../league-logos";

describe("league tier helpers", () => {
  it("Free arranca en 20", () => {
    expect(MEMBER_LIMIT_FREE).toBe(20);
    expect(TIER_MEMBER_LIMIT.free).toBe(20);
  });

  it("cada Pase tiene su tope esperado", () => {
    expect(TIER_MEMBER_LIMIT["team-50"]).toBe(50);
    expect(TIER_MEMBER_LIMIT["team-100"]).toBe(100);
    expect(TIER_MEMBER_LIMIT["team-250"]).toBe(250);
  });

  it("enterprise = sin tope numérico", () => {
    expect(TIER_MEMBER_LIMIT.enterprise).toBeNull();
  });

  it("isPremiumTier distingue Free del resto", () => {
    expect(isPremiumTier("free")).toBe(false);
    expect(isPremiumTier(null)).toBe(false);
    expect(isPremiumTier(undefined)).toBe(false);
    const premium: LeagueTier[] = ["team-50", "team-100", "team-250", "enterprise"];
    for (const t of premium) {
      expect(isPremiumTier(t)).toBe(true);
    }
  });
});

describe("preset logo gallery", () => {
  it("incluye al menos 10 logos con ids únicos", () => {
    expect(PRESET_LEAGUE_LOGOS.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(PRESET_LEAGUE_LOGOS.map((p) => p.id));
    expect(ids.size).toBe(PRESET_LEAGUE_LOGOS.length);
  });

  it("todos los presets apuntan a /league-logos/<id>.svg", () => {
    for (const p of PRESET_LEAGUE_LOGOS) {
      expect(p.url).toBe(`/league-logos/${p.id}.svg`);
    }
  });

  it("isPresetLogoUrl reconoce solo URLs de la galería", () => {
    expect(isPresetLogoUrl("/league-logos/ball.svg")).toBe(true);
    expect(isPresetLogoUrl("https://example.com/custom.png")).toBe(false);
    expect(isPresetLogoUrl(null)).toBe(false);
    expect(isPresetLogoUrl("")).toBe(false);
  });

  it("presetUrlById resuelve id válido / null para id inexistente", () => {
    expect(presetUrlById("ball")).toBe("/league-logos/ball.svg");
    expect(presetUrlById("nope")).toBeNull();
    expect(presetUrlById(null)).toBeNull();
  });

  it("DEFAULT_PRESET_LOGO_URL es siempre un URL del catálogo", () => {
    expect(isPresetLogoUrl(DEFAULT_PRESET_LOGO_URL)).toBe(true);
  });
});
