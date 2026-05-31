"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import {
  TELEGRAM_EVENTS,
  setTelegramNotificationSettings,
} from "@/lib/telegram/settings";

export type FormState = { ok: boolean; error?: string };

/**
 * Guarda qué eventos se notifican a Telegram. Recibe `enabledJson`: un mapa
 * eventKey→boolean. Las claves desconocidas se ignoran (se sanea contra
 * TELEGRAM_EVENTS en la capa de persistencia).
 */
export async function saveTelegramNotificationSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(String(formData.get("enabledJson") ?? "{}"));
  } catch {
    return { ok: false, error: "Datos malformados." };
  }

  const map: Record<string, boolean> = {};
  for (const e of TELEGRAM_EVENTS) map[e.key] = parsed[e.key] !== false;

  await setTelegramNotificationSettings(map);
  await logAdminAction({
    adminId: me.id,
    action: "telegram.notifications.update",
    payload: map,
  });

  revalidatePath("/admin/notificaciones");
  return { ok: true };
}
