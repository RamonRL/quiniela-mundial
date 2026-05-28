"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { predSpecial, specialPredictions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { runAction } from "@/lib/actions/guard";

export type FormState = { ok: boolean; error?: string };

const schema = z.object({
  predictions: z
    .array(
      z.object({
        specialId: z.coerce.number().int(),
        valueJson: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1),
});

export async function saveSpecialPredictions(
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

  // Enforce per-special deadline.
  const ids = parsed.data.predictions.map((p) => p.specialId);
  const defs = await db
    .select()
    .from(specialPredictions)
    .where(inArray(specialPredictions.id, ids));
  const defById = new Map(defs.map((d) => [d.id, d]));
  const now = new Date();
  for (const p of parsed.data.predictions) {
    const def = defById.get(p.specialId);
    if (!def) return { ok: false, error: `Predicción especial ${p.specialId} no existe.` };
    if (new Date(def.closesAt).getTime() <= now.getTime()) {
      return {
        ok: false,
        error: `La predicción "${def.question}" ya está cerrada.`,
      };
    }
  }

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) {
    return { ok: false, error: "Sin liga activa." };
  }

  return runAction(
    { action: "saveSpecialPredictions", userId: me.id, leagueId },
    async () => {
      await db.transaction(async (tx) => {
        for (const p of parsed.data.predictions) {
          if (Object.keys(p.valueJson).length === 0) continue;
          if (Object.values(p.valueJson).every((v) => v == null || v === "")) {
            await tx
              .delete(predSpecial)
              .where(
                and(
                  eq(predSpecial.userId, me.id),
                  eq(predSpecial.leagueId, leagueId),
                  eq(predSpecial.specialId, p.specialId),
                ),
              );
            continue;
          }
          await tx
            .insert(predSpecial)
            .values({
              userId: me.id,
              leagueId,
              specialId: p.specialId,
              valueJson: p.valueJson as unknown,
              submittedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [predSpecial.userId, predSpecial.leagueId, predSpecial.specialId],
              set: { valueJson: p.valueJson as unknown, submittedAt: new Date() },
            });
        }
      });

      revalidatePath("/predicciones/especiales");
      revalidatePath("/predicciones");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}
