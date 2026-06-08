"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { TZ_COOKIE, intlLocale } from "@/lib/timezone";

/**
 * Hora localizada para el LADO PÚBLICO (mejora progresiva).
 *
 * Las páginas públicas están cacheadas con ISR; leer la cookie de TZ en el
 * server las volvería dinámicas. En su lugar, el server pinta `ssr`
 * (formateado en hora de España, cacheable e indexable) y, tras montar,
 * este componente reescribe la hora a la zona del visitante:
 *   - la TZ fijada a mano / detectada que `<TimezoneSync/>` dejó en la
 *     cookie `qm_tz`, o
 *   - la TZ del navegador como fallback.
 *
 * `suppressHydrationWarning`: el texto cambia tras la hidratación a
 * propósito (SSR = España, cliente = local).
 */
export function LocalDateTime({
  iso,
  ssr,
  options,
}: {
  /** Instante en ISO/epoch — base para reformatear en cliente. */
  iso: string;
  /** Cadena ya formateada en server (hora de España) — lo que ve el crawler. */
  ssr: string;
  /** Mismas opciones de Intl que usó el server, para un formato idéntico. */
  options?: Intl.DateTimeFormatOptions;
}) {
  const [local, setLocal] = useState<string | null>(null);
  const locale = intlLocale(useLocale());

  useEffect(() => {
    let tz: string | null = null;
    const cookieTz = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TZ_COOKIE}=`))
      ?.slice(TZ_COOKIE.length + 1);
    try {
      tz = cookieTz || Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      tz = cookieTz || null;
    }
    if (!tz) return;
    try {
      const formatted = new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
        timeZone: tz,
      }).format(new Date(iso));
      setLocal(formatted);
    } catch {
      // TZ inválida o fecha mala: nos quedamos con el SSR.
    }
  }, [iso, options, locale]);

  return <span suppressHydrationWarning>{local ?? ssr}</span>;
}
