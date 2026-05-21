/**
 * Definición declarativa del tutorial de bienvenida. Los componentes
 * (`tutorial-provider`, `tutorial-overlay`, `tutorial-card`) consumen
 * este array — la única fuente de verdad sobre qué se enseña, en qué
 * orden y dónde se ancla.
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
  title: string;
  body: string;
  anchor?: {
    desktop: string;
    mobile?: string;
  };
  navigateTo?: string;
  nextLabel?: string;
  cta?: {
    label: string;
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
};

export const TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
  {
    id: "welcome",
    kind: "centered",
    title: "¡Bienvenido a Quiniela Mundial!",
    body: "Te enseño la app en 30 segundos. Puedes saltarte el tour cuando quieras pulsando la cruz arriba a la derecha.",
  },
  {
    id: "progress-hub",
    kind: "spotlight",
    title: "Tu puesto de mando",
    body: "Esta es tu base: predicciones pendientes, próximo cierre, tu posición en el ranking y las próximas jornadas para predecir. Vuelves aquí siempre que entres.",
    anchor: {
      desktop: '[data-tutorial-id="progress-hub"]',
      mobile: '[data-tutorial-id="progress-hub-mobile"]',
    },
  },
  {
    id: "league-switcher",
    kind: "spotlight",
    title: "Tu quiniela activa",
    body: "Aquí ves la quiniela en la que estás compitiendo ahora mismo. Si perteneces a varias, pulsa para alternar entre ellas. Desde tu perfil puedes crear otras nuevas o unirte con un código de 4 dígitos.",
    anchor: { desktop: '[data-tutorial-id="league-switcher"]' },
  },
  {
    id: "nav-predicciones",
    kind: "spotlight",
    title: "Tus predicciones",
    body: "Las 6 categorías viven aquí: posiciones por grupo, Bota de Oro, especiales, marcadores partido a partido, bracket y goleadores por partido. Vamos a verlas.",
    anchor: { desktop: '[data-tutorial-id="nav-predicciones"]' },
    navigateTo: "/predicciones",
    nextLabel: "Llévame a predicciones",
    // mobile-nav vive fixed-bottom → la card SIEMPRE debe ir arriba.
    mobileCardPosition: "top",
  },
  {
    id: "pre-torneo",
    kind: "spotlight",
    title: "Pre-torneo",
    body: "Los tres cierres del kickoff: posiciones por grupo, Bota de Oro y especiales. Ciérralos antes del 11 de junio — no se vuelven a abrir.",
    anchor: {
      desktop: '[data-tutorial-id="cat-pre-torneo"]',
      mobile: '[data-tutorial-id="cat-pre-torneo-mobile"]',
    },
  },
  {
    id: "jornadas",
    kind: "spotlight",
    title: "Jornada a jornada",
    body: "Cuando arranque el torneo, irán abriéndose las jornadas. Predices el marcador y el goleador de cada partido — cada partido cierra a su pitido inicial.",
    anchor: {
      desktop: '[data-tutorial-id="cat-jornadas"]',
      mobile: '[data-tutorial-id="cat-jornadas-mobile"]',
    },
  },
  {
    id: "eliminatoria",
    kind: "spotlight",
    title: "Eliminatoria",
    body: "Al final de la fase de grupos se abre el bracket: dieciseisavos, octavos, cuartos, semis y final. Es aquí donde se decide el campeón.",
    anchor: { desktop: '[data-tutorial-id="cat-eliminatoria"]' },
    // En móvil la sección Eliminatoria entera cabe, pero la card por
    // defecto la tapaba. Subimos la card al top y alineamos el target
    // con el borde inferior (block:"end") para que la zona iluminada
    // quede a la vista bajo el sheet.
    mobileCardPosition: "top",
  },
  {
    id: "finish",
    kind: "centered",
    title: "¡Listo! A predecir.",
    body: "Tienes hasta el 11 de junio para cerrar tus primeras predicciones. ¿Empezamos por las posiciones por grupo?",
    cta: {
      label: "Hacer mi primera predicción",
      href: "/predicciones/grupos",
    },
    fanfare: true,
  },
] as const;

export const TUTORIAL_TOTAL_STEPS = TUTORIAL_STEPS.length;
