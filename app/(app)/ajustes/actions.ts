"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { runAction } from "@/lib/actions/guard";

export type SettingsFormState = { ok: boolean; error?: string; message?: string };

/**
 * Valida que `tz` sea una IANA timezone real intentando construir un
 * formatter con ella. `Intl.DateTimeFormat` lanza `RangeError` si no es
 * válida. Sin librerías extra: el runtime ya conoce todas las zonas.
 */
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda la TZ preferida del usuario. Cadena vacía o "auto" → guardar
 * `null` (= "detectar/default"). Cualquier otro valor pasa por la
 * validación IANA; un valor inválido devuelve error sin tocar la BD.
 */
export async function updateTimezone(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const me = await requireUser();
  const raw = formData.get("timezone")?.toString().trim() ?? "";
  const value = raw === "" || raw === "auto" ? null : raw;
  if (value && !isValidTimeZone(value)) {
    return { ok: false, error: `Zona horaria no válida: ${value}` };
  }
  return runAction(
    { action: "updateTimezone", userId: me.id },
    async () => {
      await db
        .update(profiles)
        .set({ timezone: value })
        .where(eq(profiles.id, me.id));
      // Cualquier página de la app con horarios depende de la sesión.
      revalidatePath("/", "layout");
      return {
        ok: true,
        message: value
          ? `Zona horaria actualizada a ${value}.`
          : "Zona horaria en modo automático.",
      };
    },
    (error) => ({ ok: false, error }),
  );
}
