"use client";

import { useEffect, useRef } from "react";
import { useTutorial } from "./tutorial-provider";
import { TUTORIAL_REPLAY_KEY } from "./replay-button";

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

export function TutorialAutoStart({ firstSeen }: { firstSeen: boolean }) {
  const { start, isOpen } = useTutorial();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (isOpen || triggeredRef.current) return;

    const fromReplay =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(TUTORIAL_REPLAY_KEY) === "1";

    if (!firstSeen && !fromReplay) return;

    triggeredRef.current = true;
    if (fromReplay && typeof window !== "undefined") {
      window.sessionStorage.removeItem(TUTORIAL_REPLAY_KEY);
    }
    const t = setTimeout(start, AUTOSTART_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstSeen]);

  return null;
}
