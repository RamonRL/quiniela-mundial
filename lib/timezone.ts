/**
 * Zona horaria de la app, por usuario.
 *
 * Modelo: la TZ EFECTIVA con la que se muestran todas las fechas/horas a
 * un usuario es, por orden de prioridad:
 *   1. La fijada A MANO en Ajustes (`profiles.timezone` no nulo) — gana
 *      siempre, aunque el usuario viaje.
 *   2. La DETECTADA del navegador (cookie `qm_tz`, escrita por
 *      `<TimezoneSync/>`) — el modo "auto": sigue al usuario si cambia de
 *      país.
 *   3. España peninsular como último recurso (primer render sin cookie,
 *      cliente exótico sin Intl, etc.).
 *
 * Los instantes (deadlines, kickoffs) se guardan en UTC y NO cambian: esto
 * solo afecta al display. El cierre de predicciones es el mismo momento en
 * todo el mundo, aunque cada quien lo vea en su hora local.
 *
 * Este módulo es PURO (sin next/headers) para poder importarse desde client
 * components. La resolución server-side vive en `lib/timezone-server.ts`.
 */
export const SPAIN_TZ = "Europe/Madrid";
export const TZ_COOKIE = "qm_tz";

/** ¿Es `tz` una IANA timezone que el runtime entiende? */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
