"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";

/**
 * Marca el tutorial como completado para el usuario actual. Idempotente:
 * si ya estaba marcado (por completar normalmente o por "Saltar"), no
 * hace nada y devuelve el timestamp existente.
 *
 * Lo invoca el provider tanto cuando el usuario llega al paso final como
 * cuando pulsa "Saltar" en cualquier paso intermedio — en ambos casos
 * queremos que el tour no vuelva a auto-dispararse en sesiones futuras.
 */
export async function markTutorialCompleted(): Promise<{ ok: true }> {
  const me = await requireUser();
  if (me.tutorialCompletedAt) return { ok: true };
  await db
    .update(profiles)
    .set({ tutorialCompletedAt: new Date() })
    .where(eq(profiles.id, me.id));
  return { ok: true };
}
