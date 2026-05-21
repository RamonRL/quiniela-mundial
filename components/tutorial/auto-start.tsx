"use client";

import { useEffect, useRef } from "react";
import { useTutorial } from "./tutorial-provider";

/**
 * Dispara `tutorial.start()` cuando el usuario aterriza por primera
 * vez en `/dashboard`. Se monta solo desde el page del dashboard.
 *
 * `firstSeen=true` significa que `profiles.tutorialCompletedAt` está
 * en null en la DB → es la primera vez de este usuario. Usamos un
 * `useRef` interno para asegurar que `start()` solo se llama una vez
 * por montaje (defensa ante doble-render de StrictMode en dev).
 *
 * El delay de 800 ms da tiempo a que el ProgressHub y el resto de
 * componentes con Suspense terminen de hidratar; sin ese delay el
 * spotlight a veces apunta a un rect (0,0,0,0) porque el target aún
 * no está pintado.
 */
const AUTOSTART_DELAY_MS = 800;

export function TutorialAutoStart({ firstSeen }: { firstSeen: boolean }) {
  const { start, isOpen } = useTutorial();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!firstSeen || isOpen || triggeredRef.current) return;
    triggeredRef.current = true;
    const t = setTimeout(start, AUTOSTART_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstSeen]);

  return null;
}
