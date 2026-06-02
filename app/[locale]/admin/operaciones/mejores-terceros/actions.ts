"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { R32_SLOTS } from "@/lib/bracket-format";
import { recomputeMatchdayDeadlines } from "@/lib/matchday-deadlines";

export type FormState = { ok: boolean; error?: string; message?: string };

const schema = z.object({
  /** Map: matchCode → teamId. Slots de R32 que toman una tercera. */
  assignments: z.record(z.string(), z.coerce.number().int().positive()),
});

export async function saveBestThirds(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, error: "Datos malformados." };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { assignments } = parsed.data;

  // Cada teamId debe asignarse a un único slot.
  const seen = new Map<number, string>();
  for (const [code, teamId] of Object.entries(assignments)) {
    if (seen.has(teamId)) {
      return {
        ok: false,
        error: `La selección está asignada a dos slots: ${seen.get(teamId)} y ${code}.`,
      };
    }
    seen.set(teamId, code);
  }

  // Para cada slot, escribir homeTeamId/awayTeamId según el side del R32_SLOTS.
  const r32MatchdayIds = new Set<number>();
  await db.transaction(async (tx) => {
    for (const [code, teamId] of Object.entries(assignments)) {
      const slot = R32_SLOTS[code];
      if (!slot) continue;
      const side: "home" | "away" =
        slot.home.kind === "thirdPlace" ? "home" : "away";
      const update: Partial<typeof matches.$inferInsert> =
        side === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId };
      const [updated] = await tx
        .update(matches)
        .set(update)
        .where(eq(matches.code, code))
        .returning({ matchdayId: matches.matchdayId });
      if (updated?.matchdayId != null) r32MatchdayIds.add(updated.matchdayId);
    }
  });

  // Recompute deadlines de las jornadas R32 (defensivo, por si el primer
  // partido cambió por algún motivo).
  if (r32MatchdayIds.size > 0) {
    await recomputeMatchdayDeadlines([...r32MatchdayIds]);
  }

  await logAdminAction({
    adminId: me.id,
    action: "ops.assign_best_thirds",
    payload: { assignments },
  });

  revalidatePath("/admin/operaciones");
  revalidatePath("/admin/operaciones/mejores-terceros");
  revalidatePath("/predicciones");
  revalidatePath("/predicciones/bracket");
  revalidatePath("/predicciones/jornada/[matchdayId]", "page");
  revalidatePath("/bracket");
  revalidatePath("/calendario");
  return { ok: true, message: "Terceras ubicadas. Bracket y jornada R32 abiertos." };
}
