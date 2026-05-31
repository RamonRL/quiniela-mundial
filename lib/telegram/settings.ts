/**
 * Ajustes de qué eventos se notifican a Telegram. Persisten en
 * `app_settings` bajo la clave `telegram_notifications` como un mapa
 * eventKey → boolean. Por defecto TODO está activado: un evento solo deja
 * de notificar si su flag está explícitamente en `false`.
 *
 * El gate (`isTelegramEventEnabled`) falla en ABIERTO: si la lectura de la
 * BD revienta, asumimos activado. Importa sobre todo para `server.error`,
 * cuyo aviso no queremos perder justo cuando algo va mal con la BD.
 */
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { TELEGRAM_EVENTS, type TelegramEventKey } from "./event-keys";

// Re-export para los consumidores de servidor que ya importaban desde aquí.
export { TELEGRAM_EVENTS, type TelegramEventKey };

const SETTINGS_KEY = "telegram_notifications";

/**
 * Lectura cruda del mapa guardado, cacheada por request. Falla en abierto:
 * ante cualquier error devuelve `{}` → todo activado por defecto.
 */
const getRawSettings = cache(async (): Promise<Record<string, boolean>> => {
  try {
    const [row] = await db
      .select({ valueJson: appSettings.valueJson })
      .from(appSettings)
      .where(eq(appSettings.key, SETTINGS_KEY))
      .limit(1);
    return (row?.valueJson as Record<string, boolean> | undefined) ?? {};
  } catch (err) {
    console.warn("[telegram] no se pudieron leer los ajustes de notificación:", err);
    return {};
  }
});

/** ¿Está activado este evento? Default true (solo `false` lo desactiva). */
export async function isTelegramEventEnabled(
  key: TelegramEventKey,
): Promise<boolean> {
  const raw = await getRawSettings();
  return raw[key] !== false;
}

/** Mapa completo eventKey→enabled, con defaults aplicados (para el admin). */
export async function getTelegramNotificationSettings(): Promise<
  Record<TelegramEventKey, boolean>
> {
  const raw = await getRawSettings();
  const out = {} as Record<TelegramEventKey, boolean>;
  for (const e of TELEGRAM_EVENTS) out[e.key] = raw[e.key] !== false;
  return out;
}

/** Persiste el mapa (sanea a las claves conocidas). */
export async function setTelegramNotificationSettings(
  map: Record<string, boolean>,
): Promise<void> {
  const clean: Record<string, boolean> = {};
  for (const e of TELEGRAM_EVENTS) clean[e.key] = map[e.key] !== false;
  await db
    .insert(appSettings)
    .values({ key: SETTINGS_KEY, valueJson: clean, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueJson: clean, updatedAt: new Date() },
    });
}
