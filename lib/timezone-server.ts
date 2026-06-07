import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/guards";
import { SPAIN_TZ, TZ_COOKIE, isValidTimeZone } from "@/lib/timezone";

/**
 * TZ efectiva del usuario para esta petición (server-only — usa
 * next/headers). Cacheada por request: la resolución (sesión + cookie)
 * ocurre una sola vez aunque la llamen varios server components.
 *
 * Prioridad: TZ fijada a mano (`profiles.timezone`) → cookie `qm_tz`
 * (navegador, modo auto) → España.
 *
 * Solo para superficies ya dinámicas (layout/páginas autenticadas que ya
 * leen sesión). NO usar en páginas públicas con ISR: leer cookies las
 * volvería dinámicas. Para el público está `<LocalDateTime/>` (cliente).
 */
export const getEffectiveTimeZone = cache(async (): Promise<string> => {
  const me = await getCurrentUser();
  if (isValidTimeZone(me?.timezone)) return me!.timezone!;
  const cookieTz = (await cookies()).get(TZ_COOKIE)?.value;
  if (isValidTimeZone(cookieTz)) return cookieTz;
  return SPAIN_TZ;
});
