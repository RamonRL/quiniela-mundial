/**
 * Definición declarativa del tutorial de bienvenida. Los componentes
 * (`tutorial-provider`, `tutorial-overlay`, `tutorial-card`) consumen
 * este array — la única fuente de verdad sobre qué se enseña, en qué
 * orden y dónde se ancla.
 *
 * i18n: el texto NO vive aquí. Cada paso declara `titleKey` / `bodyKey`
 * (y opcionalmente `nextLabelKey` / `cta.labelKey`) que el componente
 * resuelve con `useTranslations("tutorial")`. Así `steps.ts` sigue
 * siendo data pura serializable y los strings se traducen ES/EN/FR/PT.
 *
 * Reglas:
 *  - El `id` es único y estable; se usa en la URL del replay y en el
 *    test unitario.
 *  - `kind: "centered"` → modal centrado, sin spotlight ni anchor.
 *  - `kind: "spotlight"` → debe declarar `anchor`. El provider busca el
 *    primer elemento visible que match el selector (priorizando el
 *    `mobile` si el viewport es < 768 px).
 *  - `navigateTo` se ejecuta al pulsar "Siguiente" ANTES de pasar al
 *    siguiente paso. Pensado para cross-page del paso 4 → 5.
 *  - `cta` reemplaza al botón "Siguiente" en el paso final.
 *  - `fanfare: true` dispara el confeti al renderizar el paso.
 */

export type TutorialStep = {
  id: string;
  kind: "centered" | "spotlight";
  /** Clave i18n del título (namespace "tutorial"). */
  titleKey: string;
  /** Clave i18n del cuerpo (namespace "tutorial"). */
  bodyKey: string;
  anchor?: {
    desktop: string;
    mobile?: string;
  };
  navigateTo?: string;
  /** Clave i18n para el botón "Siguiente" en este paso. */
  nextLabelKey?: string;
  cta?: {
    /** Clave i18n de la etiqueta del CTA final. */
    labelKey: string;
    href: string;
  };
  fanfare?: boolean;
  /**
   * Override del lado en el que montar la card en móvil:
   *  - `"top"`    → la card baja desde arriba (top sheet). Útil cuando el
   *                  spotlight ocupa la mitad inferior del viewport.
   *  - `"bottom"` → la card sube desde abajo (bottom sheet clásico).
   *  - undefined  → heurística automática según `targetRect`.
   *
   * El provider también usa esta pista para decidir `block:"end"` vs
   * `block:"start"` al hacer `scrollIntoView`, alineando el target con
   * el lado opuesto al de la card.
   */
  mobileCardPosition?: "top" | "bottom";
  /**
   * Renderiza un componente especial dentro de la card. Identificador
   * stringly-typed para que `steps.ts` no tenga que importar JSX.
   *   - `"install"` → tabs Android / iOS con pasos para añadir la app
   *     a la pantalla de inicio.
   */
  slot?: "install";
};

/** Los 3 modos de juego de una liga (espejo de `lib/prediction-modes`). */
export type TutorialMode = "completo" | "marcador" | "solo_ganador";

// ──────────────── Pasos compartidos por los 3 modos ────────────────

const STEP_WELCOME: TutorialStep = {
  id: "welcome",
  kind: "centered",
  titleKey: "welcomeTitle",
  bodyKey: "welcomeBody",
};

const STEP_LEAGUE_SWITCHER: TutorialStep = {
  id: "league-switcher",
  kind: "spotlight",
  titleKey: "switcherTitle",
  bodyKey: "switcherBody",
  anchor: { desktop: '[data-tutorial-id="league-switcher"]' },
};

const STEP_INSTALL: TutorialStep = {
  id: "install",
  kind: "centered",
  titleKey: "installTitle",
  bodyKey: "installBody",
  slot: "install",
};

// ──────────────────── Tutorial COMPLETO (6 categorías) ───────────────────

export const TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
  STEP_WELCOME,
  {
    id: "progress-hub",
    kind: "spotlight",
    titleKey: "hubTitle",
    bodyKey: "hubBody",
    anchor: {
      desktop: '[data-tutorial-id="progress-hub"]',
      mobile: '[data-tutorial-id="progress-hub-mobile"]',
    },
  },
  STEP_LEAGUE_SWITCHER,
  {
    id: "nav-predicciones",
    kind: "spotlight",
    titleKey: "navTitle",
    bodyKey: "navBodyFull",
    anchor: { desktop: '[data-tutorial-id="nav-predicciones"]' },
    navigateTo: "/predicciones",
    nextLabelKey: "navNextLabel",
    // mobile-nav vive fixed-bottom → la card SIEMPRE debe ir arriba.
    mobileCardPosition: "top",
  },
  {
    id: "pre-torneo",
    kind: "spotlight",
    titleKey: "preTitle",
    bodyKey: "preBody",
    anchor: {
      desktop: '[data-tutorial-id="cat-pre-torneo"]',
      mobile: '[data-tutorial-id="cat-pre-torneo-mobile"]',
    },
  },
  {
    id: "jornadas",
    kind: "spotlight",
    titleKey: "jorTitle",
    bodyKey: "jorBodyFull",
    anchor: {
      desktop: '[data-tutorial-id="cat-jornadas"]',
      mobile: '[data-tutorial-id="cat-jornadas-mobile"]',
    },
  },
  {
    id: "eliminatoria",
    kind: "spotlight",
    titleKey: "elimTitle",
    bodyKey: "elimBody",
    anchor: { desktop: '[data-tutorial-id="cat-eliminatoria"]' },
    // En móvil la sección Eliminatoria entera cabe, pero la card por
    // defecto la tapaba. Subimos la card al top y alineamos el target
    // con el borde inferior (block:"end") para que la zona iluminada
    // quede a la vista bajo el sheet.
    mobileCardPosition: "top",
  },
  STEP_INSTALL,
  {
    id: "finish",
    kind: "centered",
    titleKey: "finishTitle",
    bodyKey: "finishBodyFull",
    cta: {
      labelKey: "finishCta",
      href: "/predicciones/grupos",
    },
    fanfare: true,
  },
] as const;

// ─────────────── Tutorial reducido (Marcador / Solo Ganador) ──────────────
//
// Estas quinielas solo predicen partidos: no hay pre-torneo, bota, especiales
// ni bracket. El tour salta esas paradas y se centra en el modo de predicción
// que toca. Comparte welcome / puesto de mando / quiniela activa / instalar.

const STEP_PROGRESS_HUB_REDUCED: TutorialStep = {
  id: "progress-hub",
  kind: "spotlight",
  titleKey: "hubTitle",
  bodyKey: "hubBodyReduced",
  anchor: {
    desktop: '[data-tutorial-id="progress-hub"]',
    mobile: '[data-tutorial-id="progress-hub-mobile"]',
  },
};

function buildReducedSteps(opts: {
  navBodyKey: string;
  jornadasBodyKey: string;
}): ReadonlyArray<TutorialStep> {
  return [
    STEP_WELCOME,
    STEP_PROGRESS_HUB_REDUCED,
    STEP_LEAGUE_SWITCHER,
    {
      id: "nav-predicciones",
      kind: "spotlight",
      titleKey: "navTitle",
      bodyKey: opts.navBodyKey,
      anchor: { desktop: '[data-tutorial-id="nav-predicciones"]' },
      navigateTo: "/predicciones",
      nextLabelKey: "navNextLabel",
      mobileCardPosition: "top",
    },
    {
      id: "jornadas",
      kind: "spotlight",
      titleKey: "jorTitle",
      bodyKey: opts.jornadasBodyKey,
      anchor: {
        desktop: '[data-tutorial-id="cat-jornadas"]',
        mobile: '[data-tutorial-id="cat-jornadas-mobile"]',
      },
    },
    STEP_INSTALL,
    {
      id: "finish",
      kind: "centered",
      titleKey: "finishTitle",
      bodyKey: "finishBodyReduced",
      cta: {
        labelKey: "finishCta",
        href: "/predicciones",
      },
      fanfare: true,
    },
  ] as const;
}

export const TUTORIAL_STEPS_MARCADOR: ReadonlyArray<TutorialStep> =
  buildReducedSteps({
    navBodyKey: "navBodyMarcador",
    jornadasBodyKey: "jorBodyMarcador",
  });

export const TUTORIAL_STEPS_SOLO_GANADOR: ReadonlyArray<TutorialStep> =
  buildReducedSteps({
    navBodyKey: "navBodySoloGanador",
    jornadasBodyKey: "jorBodySoloGanador",
  });

/** Devuelve los pasos del tutorial según el modo de la liga activa. */
export function getTutorialSteps(
  mode: TutorialMode | string | null | undefined,
): ReadonlyArray<TutorialStep> {
  if (mode === "marcador") return TUTORIAL_STEPS_MARCADOR;
  if (mode === "solo_ganador") return TUTORIAL_STEPS_SOLO_GANADOR;
  return TUTORIAL_STEPS;
}

export const TUTORIAL_TOTAL_STEPS = TUTORIAL_STEPS.length;
