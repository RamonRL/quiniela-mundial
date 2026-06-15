"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";

export type LinkResult = { ok: boolean; error?: string; message?: string };

/**
 * Aplica los vínculos jugador→providerPlayerId revisados por el admin. Form
 * fields: `link:<playerId>` = apiId. Valida 1:1 dentro del envío y captura
 * colisiones con ids ya en uso (la columna es UNIQUE).
 */
export async function linkPlayers(formData: FormData): Promise<LinkResult> {
  const me = await requireAdmin();

  const pairs: { playerId: number; apiId: number }[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("link:")) continue;
    const playerId = Number(k.slice(5));
    const apiId = Number(v);
    if (Number.isFinite(playerId) && Number.isFinite(apiId) && apiId > 0) {
      pairs.push({ playerId, apiId });
    }
  }
  if (pairs.length === 0) return { ok: false, error: "No seleccionaste ningún vínculo." };

  // No asignar el mismo jugador de API a dos de los nuestros en este envío.
  const seen = new Set<number>();
  for (const p of pairs) {
    if (seen.has(p.apiId)) {
      return { ok: false, error: `Un mismo jugador de API-Football está asignado a dos jugadores. Revísalo.` };
    }
    seen.add(p.apiId);
  }

  let linked = 0;
  const failed: number[] = [];
  for (const p of pairs) {
    try {
      await db
        .update(players)
        .set({ providerPlayerId: p.apiId })
        .where(eq(players.id, p.playerId));
      linked += 1;
    } catch {
      // Choca con el UNIQUE (ese apiId ya está vinculado a otro jugador).
      failed.push(p.playerId);
    }
  }

  await logAdminAction({
    adminId: me.id,
    action: "players.link_provider",
    payload: { linked, failed },
  });
  revalidatePath("/admin/jugadores/vincular");

  return {
    ok: true,
    message:
      `${linked} vínculo(s) guardados` +
      (failed.length ? ` · ${failed.length} fallaron (ese id de API ya estaba en uso)` : "") +
      ".",
  };
}
