"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { predGroupRanking } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";

export type SaveGroupResult = { ok: boolean; error?: string };

const TOURNAMENT_KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

const schema = z.object({
  groupId: z.coerce.number().int(),
  pos1TeamId: z.coerce.number().int(),
  pos2TeamId: z.coerce.number().int(),
  pos3TeamId: z.coerce.number().int(),
  pos4TeamId: z.coerce.number().int(),
});

/**
 * Auto-save de UN solo grupo desde el modo interactivo. UPSERT por
 * (userId, leagueId, groupId). NO llama revalidatePath para no
 * invalidar el cache de /predicciones en cada paso — eso lo hace
 * `endGroupsTour()` al cerrar el tour.
 */
export async function saveGroupPredictionForGroup(
  input: z.infer<typeof schema>,
): Promise<SaveGroupResult> {
  const me = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  if (TOURNAMENT_KICKOFF.getTime() <= Date.now()) {
    return { ok: false, error: "Predicciones cerradas: el torneo ya empezó." };
  }
  const leagueId = await currentLeagueId(me);
  if (leagueId == null) return { ok: false, error: "Sin liga activa." };

  await db
    .insert(predGroupRanking)
    .values({
      userId: me.id,
      leagueId,
      groupId: parsed.data.groupId,
      pos1TeamId: parsed.data.pos1TeamId,
      pos2TeamId: parsed.data.pos2TeamId,
      pos3TeamId: parsed.data.pos3TeamId,
      pos4TeamId: parsed.data.pos4TeamId,
      submittedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        predGroupRanking.userId,
        predGroupRanking.leagueId,
        predGroupRanking.groupId,
      ],
      set: {
        pos1TeamId: parsed.data.pos1TeamId,
        pos2TeamId: parsed.data.pos2TeamId,
        pos3TeamId: parsed.data.pos3TeamId,
        pos4TeamId: parsed.data.pos4TeamId,
        submittedAt: new Date(),
      },
    });

  return { ok: true };
}

/**
 * Cierre del tour: revalida los paths afectados de una sola vez.
 * Llamada al hacer "Finalizar" o al pulsar "Salir" desde la topbar.
 */
export async function endGroupsTour(): Promise<void> {
  revalidatePath("/predicciones/grupos");
  revalidatePath("/predicciones");
  revalidatePath("/dashboard");
}
