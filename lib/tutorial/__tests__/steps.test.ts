import { describe, expect, it } from "vitest";
import { TUTORIAL_STEPS, TUTORIAL_TOTAL_STEPS } from "../steps";

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
