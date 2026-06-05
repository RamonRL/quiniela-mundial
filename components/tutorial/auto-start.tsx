"use client";

import { useEffect, useRef } from "react";
import { useTutorial } from "./tutorial-provider";
import { TUTORIAL_REPLAY_KEY } from "./replay-button";
import { WELCOME_CLOSED_EVENT } from "@/components/leagues/league-welcome-dialog";

/**
 * Dispara `tutorial.start()` cuando el usuario aterriza en `/dashboard`
 * y uno de estos dos casos aplica:
 *
 *   1. **Primer login**: `firstSeen=true` (la columna
 *      `tutorialCompletedAt` aún está en null en la DB).
 *   2. **Replay desde otra ruta**: el `TutorialReplayButton` dejó
 *      `tutorial:replay=1` en sessionStorage antes de navegar aquí.
 *      Lo consumimos al detectarlo.
 *
 * Se monta solo desde el page del dashboard. El delay da tiempo a que
 * los componentes con Suspense terminen de hidratar; sin él, el
 * spotlight a veces apuntaba a un rect (0,0,0,0).
 */
const AUTOSTART_DELAY_MS = 800;

export function TutorialAutoStart({
  firstSeen,
  holdForWelcome = false,
}: {
  firstSeen: boolean;
  /**
   * true mientras el popup de bienvenida a la liga está en pantalla
   * (?welcome=1): el tutorial espera al evento WELCOME_CLOSED_EVENT en
   * vez de solaparse con él. Fallback: cuando el popup limpia el query
   * param, la prop vuelve a false y el efecto re-dispara igualmente.
   */
  holdForWelcome?: boolean;
}) {
  const { start, isOpen } = useTutorial();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (isOpen || triggeredRef.current) return;

    const fromReplay =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(TUTORIAL_REPLAY_KEY) === "1";

    if (!firstSeen && !fromReplay) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      if (fromReplay && typeof window !== "undefined") {
        window.sessionStorage.removeItem(TUTORIAL_REPLAY_KEY);
      }
      timer = setTimeout(start, AUTOSTART_DELAY_MS);
    };

    if (holdForWelcome) {
      window.addEventListener(WELCOME_CLOSED_EVENT, fire, { once: true });
      return () => {
        window.removeEventListener(WELCOME_CLOSED_EVENT, fire);
        if (timer) clearTimeout(timer);
      };
    }

    fire();
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstSeen, holdForWelcome]);

  return null;
}
