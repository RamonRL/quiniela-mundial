"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE } from "@/lib/timezone";

/**
 * Mantiene la cookie `qm_tz` con la TZ de DISPLAY del navegador, para que
 * el server renderice las horas en la zona del usuario.
 *
 * Política de escritura:
 *   - Si el usuario tiene una TZ fijada a mano (`pinnedTz`), la cookie
 *     guarda esa — así el lado público (que lee la cookie en cliente)
 *     también respeta la elección manual.
 *   - Si no (modo auto), guarda la TZ detectada del navegador. Si el
 *     usuario viaja y cambia la TZ del dispositivo, la cookie se actualiza
 *     y forzamos un `router.refresh()` para que el server re-renderice con
 *     la nueva zona. El refresh solo ocurre cuando el valor CAMBIA (primer
 *     render, o cambio de país), no en cada navegación.
 */
export function TimezoneSync({ pinnedTz }: { pinnedTz: string | null }) {
  const router = useRouter();

  useEffect(() => {
    let detected: string | null = null;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      detected = null;
    }
    const desired = pinnedTz ?? detected;
    if (!desired) return;

    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TZ_COOKIE}=`))
      ?.slice(TZ_COOKIE.length + 1);

    if (current === desired) return;

    // 1 año, lax: es solo preferencia de display, no sensible.
    document.cookie = `${TZ_COOKIE}=${desired};path=/;max-age=31536000;samesite=lax`;
    // Re-render del server para que las horas salgan ya en la zona correcta.
    router.refresh();
  }, [pinnedTz, router]);

  return null;
}
