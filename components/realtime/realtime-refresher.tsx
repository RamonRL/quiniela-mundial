"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Subscription = {
  /** Public table to listen on (e.g. "chat_messages") */
  table: string;
  /** Optional Supabase Realtime filter, e.g. "match_id=eq.42" */
  filter?: string;
};

/**
 * Coalesce de ráfagas: si llegan varios eventos en < `DEBOUNCE_MS`, solo
 * disparamos un `router.refresh()`. Sin esto, un partido con 3 cambios
 * (cambio de score + 1 goleador + status update) en menos de un segundo
 * provocaba 3 re-renders SSR encadenados — multiplicado por N usuarios
 * mirando, eso saturaba el pool de Postgres.
 */
const DEBOUNCE_MS = 400;

/**
 * Jitter aleatorio que se suma a la espera. Clave a escala: en un gol del
 * partido más visto, Supabase publica el evento a TODOS los suscriptores a la
 * vez. Sin jitter, 50k clientes harían `router.refresh()` en la misma ventana
 * de ~50ms → ola sincronizada de 50k peticiones SSR → pool de Postgres
 * agotado. El jitter reparte esas peticiones a lo largo de ~1,5s.
 */
const JITTER_MS = 1500;

/**
 * Tope duro por cliente: como mucho un `router.refresh()` cada
 * `MIN_INTERVAL_MS`, pase lo que pase. Protege contra un partido muy movido
 * (varios eventos por segundo) que dispararía un refresh tras otro.
 */
const MIN_INTERVAL_MS = 3000;

/**
 * Drop-in client component that subscribes to Supabase Realtime row events on
 * the given tables and triggers `router.refresh()` whenever something changes.
 * Used to make pages "live" without writing custom diffing logic — the server
 * re-renders with fresh data and React reconciles.
 */
export function RealtimeRefresher({
  channelKey,
  subscriptions,
}: {
  /** Stable identifier — different values give different channels */
  channelKey: string;
  subscriptions: Subscription[];
}) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`refresher:${channelKey}`);

    const scheduleRefresh = () => {
      // Si ya hay un refresh en cola, los eventos extra se descartan: vamos a
      // refrescar de todas formas y traeremos el estado más reciente. Esto
      // coalesce la ráfaga sin reprogramar (evita que un goteo continuo de
      // eventos posponga el refresh indefinidamente).
      if (timerRef.current != null) return;
      const sinceLast = Date.now() - lastRefreshRef.current;
      // Espera = debounce + jitter aleatorio, pero nunca antes de que se cumpla
      // el intervalo mínimo desde el último refresh de este cliente.
      const wait = Math.max(
        DEBOUNCE_MS + Math.random() * JITTER_MS,
        MIN_INTERVAL_MS - sinceLast,
      );
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        lastRefreshRef.current = Date.now();
        router.refresh();
      }, wait);
    };

    for (const sub of subscriptions) {
      const config: Record<string, unknown> = {
        event: "*",
        schema: "public",
        table: sub.table,
      };
      if (sub.filter) config.filter = sub.filter;
      channel.on("postgres_changes" as never, config as never, scheduleRefresh);
    }

    channel.subscribe();
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [channelKey, JSON.stringify(subscriptions), router]);

  return null;
}
