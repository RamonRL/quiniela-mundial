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
    body: "Esta es tu base. Aquí ves qué predicciones llevas hechas, cuál es el próximo cierre y tu posición en el ranking. Es la primera pantalla que verás cada vez que entres.",
    anchor: { desktop: '[data-tutorial-id="progress-hub"]' },
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
  },
  {
    id: "categorias",
    kind: "spotlight",
    title: "Las categorías",
    body: "Antes del kickoff (11 de junio) cierran las tres pre-torneo: grupos, Bota de Oro y especiales. En cuanto arranque el Mundial irán abriéndose las jornadas y, al final de la fase de grupos, el bracket eliminatorio.",
    anchor: { desktop: '[data-tutorial-id="categorias"]' },
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
