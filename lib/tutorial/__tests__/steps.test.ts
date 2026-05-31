import { describe, expect, it } from "vitest";
import {
  TUTORIAL_STEPS,
  TUTORIAL_STEPS_MARCADOR,
  TUTORIAL_STEPS_SOLO_GANADOR,
  TUTORIAL_TOTAL_STEPS,
  getTutorialSteps,
} from "../steps";

describe("TUTORIAL_STEPS", () => {
  it("tiene 9 pasos exactos (bienvenida, 3 del dashboard, 3 de predicciones, install, cierre)", () => {
    expect(TUTORIAL_STEPS).toHaveLength(9);
    expect(TUTORIAL_TOTAL_STEPS).toBe(9);
  });

  it("todos los ids son únicos", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("empieza con paso 'welcome' (modal centrado) y termina con 'finish' (CTA + fanfare)", () => {
    expect(TUTORIAL_STEPS[0].id).toBe("welcome");
    expect(TUTORIAL_STEPS[0].kind).toBe("centered");
    expect(TUTORIAL_STEPS[0].anchor).toBeUndefined();

    const last = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(last.id).toBe("finish");
    expect(last.kind).toBe("centered");
    expect(last.fanfare).toBe(true);
    expect(last.cta?.href).toBe("/predicciones/grupos");
  });

  it("los pasos spotlight declaran selector desktop válido", () => {
    const spotlightSteps = TUTORIAL_STEPS.filter((s) => s.kind === "spotlight");
    for (const step of spotlightSteps) {
      expect(step.anchor?.desktop).toMatch(/^\[data-tutorial-id="[a-z-]+"\]$/);
    }
  });

  it("el paso de navegación cross-page apunta a /predicciones", () => {
    const withNav = TUTORIAL_STEPS.filter((s) => s.navigateTo);
    expect(withNav).toHaveLength(1);
    expect(withNav[0].id).toBe("nav-predicciones");
    expect(withNav[0].navigateTo).toBe("/predicciones");
  });

  it("body y title de cada paso no están vacíos", () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });
});

describe("tutoriales reducidos (Marcador / Solo Ganador)", () => {
  const reduced = [
    ["marcador", TUTORIAL_STEPS_MARCADOR] as const,
    ["solo_ganador", TUTORIAL_STEPS_SOLO_GANADOR] as const,
  ];

  it("tienen 7 pasos: sin pre-torneo ni eliminatoria", () => {
    for (const [, steps] of reduced) {
      expect(steps).toHaveLength(7);
      const ids = steps.map((s) => s.id);
      expect(ids).not.toContain("pre-torneo");
      expect(ids).not.toContain("eliminatoria");
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("empiezan en 'welcome' y acaban en 'finish' con CTA a /predicciones", () => {
    for (const [, steps] of reduced) {
      expect(steps[0].id).toBe("welcome");
      const last = steps[steps.length - 1];
      expect(last.id).toBe("finish");
      expect(last.fanfare).toBe(true);
      expect(last.cta?.href).toBe("/predicciones");
    }
  });

  it("conservan el único paso de navegación cross-page a /predicciones", () => {
    for (const [, steps] of reduced) {
      const withNav = steps.filter((s) => s.navigateTo);
      expect(withNav).toHaveLength(1);
      expect(withNav[0].navigateTo).toBe("/predicciones");
    }
  });

  it("Marcador y Solo Ganador tienen copy distinto en el paso de jornadas", () => {
    const mJor = TUTORIAL_STEPS_MARCADOR.find((s) => s.id === "jornadas");
    const gJor = TUTORIAL_STEPS_SOLO_GANADOR.find((s) => s.id === "jornadas");
    expect(mJor?.body).not.toBe(gJor?.body);
    expect(mJor?.body).toMatch(/marcador/i);
    expect(gJor?.body).toMatch(/gana|empate/i);
  });
});

describe("getTutorialSteps", () => {
  it("mapea cada modo a su variante; desconocidos → completo", () => {
    expect(getTutorialSteps("completo")).toBe(TUTORIAL_STEPS);
    expect(getTutorialSteps("marcador")).toBe(TUTORIAL_STEPS_MARCADOR);
    expect(getTutorialSteps("solo_ganador")).toBe(TUTORIAL_STEPS_SOLO_GANADOR);
    expect(getTutorialSteps(null)).toBe(TUTORIAL_STEPS);
    expect(getTutorialSteps(undefined)).toBe(TUTORIAL_STEPS);
    expect(getTutorialSteps("otra-cosa")).toBe(TUTORIAL_STEPS);
  });
});
