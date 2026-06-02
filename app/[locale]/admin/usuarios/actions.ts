"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, profiles } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";

export async function setUserBanned(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId"));
  const banned = formData.get("banned") === "1";

  await db
    .update(profiles)
    .set({ bannedAt: banned ? new Date() : null })
    .where(eq(profiles.id, userId));

  await logAdminAction({
    adminId: me.id,
    action: banned ? "user.ban" : "user.unban",
    payload: { userId },
  });

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/chat");
}

export async function setUserRole(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as "user" | "admin";
  if (role !== "user" && role !== "admin") return;

  await db.update(profiles).set({ role }).where(eq(profiles.id, userId));

  await logAdminAction({
    adminId: me.id,
    action: "user.role",
    payload: { userId, role },
  });

  revalidatePath("/admin/usuarios");
}

export type DeleteUserResult = { ok: boolean; error?: string; message?: string };

/**
 * Elimina por completo a un usuario:
 *  1. Borra las ligas privadas en las que es el ÚNICO miembro (con su
 *     cascada: predicciones, ledger, chat de esas ligas).
 *  2. Borra el `profiles` — la FK en cascada lo saca de TODAS sus ligas y
 *     limpia predicciones, puntos, mensajes, etc.
 *  3. Borra el usuario de Supabase Auth (si no, al volver a entrar
 *     getCurrentUser recrearía el perfil vacío).
 *
 * Irreversible. No permite autoeliminarse.
 */
export async function deleteUser(formData: FormData): Promise<DeleteUserResult> {
  const me = await requireAdmin();
  const userId = String(formData.get("userId"));
  if (!userId) return { ok: false, error: "Usuario inválido." };
  if (userId === me.id) {
    return { ok: false, error: "No puedes eliminar tu propia cuenta." };
  }

  // Ligas privadas donde este usuario es el único miembro → se borran enteras.
  const soloRows = await db.execute<{ id: number }>(sql`
    SELECT l.id
    FROM ${leagues} l
    JOIN league_memberships lm ON lm.league_id = l.id
    WHERE l.is_public = false
    GROUP BY l.id
    HAVING count(*) = 1 AND bool_or(lm.user_id = ${userId})
  `);
  const soloLeagueIds = (soloRows as unknown as { id: number }[]).map((r) => r.id);

  await db.transaction(async (tx) => {
    if (soloLeagueIds.length > 0) {
      await tx.delete(leagues).where(inArray(leagues.id, soloLeagueIds));
    }
    await tx.delete(profiles).where(eq(profiles.id, userId));
  });

  // Auth: best-effort. Si falla, el perfil ya no existe pero el usuario
  // podría volver a registrarse — lo avisamos en el resultado.
  let authWarning: string | undefined;
  try {
    const svc = createSupabaseServiceClient();
    const { error } = await svc.auth.admin.deleteUser(userId);
    if (error) authWarning = error.message;
  } catch (e) {
    authWarning = e instanceof Error ? e.message : "No se pudo borrar de Auth.";
  }

  await logAdminAction({
    adminId: me.id,
    action: "user.delete",
    payload: { userId, soloLeagueIds, authWarning: authWarning ?? null },
  });

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/chat");

  const soloNote =
    soloLeagueIds.length > 0
      ? ` Se borraron ${soloLeagueIds.length} quiniela${soloLeagueIds.length === 1 ? "" : "s"} privada${soloLeagueIds.length === 1 ? "" : "s"} sin más miembros.`
      : "";
  return {
    ok: true,
    message: authWarning
      ? `Usuario borrado de la base de datos, pero no de Auth (${authWarning}).${soloNote}`
      : `Usuario eliminado.${soloNote}`,
  };
}
