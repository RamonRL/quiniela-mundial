"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Auto-refresh por intervalo (alternativa LIGERA al RealtimeRefresher).
 *
 * A diferencia del realtime —que publica el evento a TODOS los clientes a la
 * vez en cada cambio (estampida sincronizada que satura el pool de Postgres)—
 * aquí cada cliente refresca en su propio reloj, con un arranque ALEATORIO
 * dentro del intervalo. Así 1.500 usuarios reparten sus `router.refresh()` a lo
 * largo de los 5 min en vez de dispararlos juntos → carga plana, sin picos.
 *
 * Pensado para datos que cambian poco y no necesitan ser instantáneos
 * (p. ej. la clasificación de grupos, que solo cambia al acabar un partido).
 * El `router.refresh()` re-renderiza el server component con datos frescos
 * aunque la página tenga ISR.
 */
export function IntervalRefresher({ intervalMs = 5 * 60 * 1000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let intervalId: number | undefined;
    // Arranque desincronizado: primer refresh en un punto aleatorio del
    // intervalo; a partir de ahí, cadencia fija.
    const startId = window.setTimeout(
      () => {
        router.refresh();
        intervalId = window.setInterval(() => router.refresh(), intervalMs);
      },
      Math.random() * intervalMs,
    );

    return () => {
      window.clearTimeout(startId);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [intervalMs, router]);

  return null;
}
