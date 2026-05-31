"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { predGroupRanking } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { runAction } from "@/lib/actions/guard";

export type FormState = { ok: boolean; error?: string };

const TOURNAMENT_KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

const schema = z.object({
  predictions: z
    .array(
      z.object({
        groupId: z.coerce.number().int(),
        pos1TeamId: z.coerce.number().int().nullable(),
        pos2TeamId: z.coerce.number().int().nullable(),
        pos3TeamId: z.coerce.number().int().nullable(),
        pos4TeamId: z.coerce.number().int().nullable(),
      }),
    )
    .min(1),
});

export async function saveGroupPredictions(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, error: "Datos malformados." };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  if (TOURNAMENT_KICKOFF.getTime() <= Date.now()) {
    return {
      ok: false,
      error: "Predicciones cerradas: el torneo ya empezó.",
    };
  }

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) {
    return { ok: false, error: "Sin liga activa." };
  }
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") {
    return { ok: false, error: "Esta quiniela no predice grupos." };
  }

  return runAction(
    { action: "saveGroupPredictions", userId: me.id, leagueId },
    async () => {
      await db.transaction(async (tx) => {
        for (const p of parsed.data.predictions) {
          await tx
            .insert(predGroupRanking)
            .values({
              userId: me.id,
              leagueId,
              groupId: p.groupId,
              pos1TeamId: p.pos1TeamId ?? null,
              pos2TeamId: p.pos2TeamId ?? null,
              pos3TeamId: p.pos3TeamId ?? null,
              pos4TeamId: p.pos4TeamId ?? null,
              submittedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                predGroupRanking.userId,
                predGroupRanking.leagueId,
                predGroupRanking.groupId,
              ],
              set: {
                pos1TeamId: p.pos1TeamId ?? null,
                pos2TeamId: p.pos2TeamId ?? null,
                pos3TeamId: p.pos3TeamId ?? null,
                pos4TeamId: p.pos4TeamId ?? null,
                submittedAt: new Date(),
              },
            });
        }
      });

      revalidatePath("/predicciones/grupos");
      revalidatePath("/predicciones");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}
