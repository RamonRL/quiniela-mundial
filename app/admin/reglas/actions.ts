"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { scoringRules } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { recomputeAllScoring } from "@/lib/scoring/persistence";
import { runAction } from "@/lib/actions/guard";

export type FormState = { ok: boolean; error?: string };

const schema = z.object({
  rules: z
    .array(
      z.object({
        key: z.string().min(1),
        points: z.coerce.number().int(),
      }),
    )
    .min(1),
});

export async function saveRules(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  let rules: { key: string; points: number }[] = [];
  try {
    rules = JSON.parse(String(formData.get("rulesJson") ?? "[]"));
  } catch {
    return { ok: false, error: "Datos malformados." };
  }
  const parsed = schema.safeParse({ rules });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  return runAction(
    { action: "saveRules", userId: me.id },
    async () => {
      await db.transaction(async (tx) => {
        for (const r of parsed.data.rules) {
          await tx
            .update(scoringRules)
            .set({ valueJson: { points: r.points }, updatedAt: new Date() })
            .where(eq(scoringRules.key, r.key));
        }
      });
      await logAdminAction({
        adminId: me.id,
        action: "scoring.rules.update",
        payload: { count: parsed.data.rules.length },
      });
      // Recalculate everything in the background. For now, do it synchronously to
      // keep things simple — for a friend group it'll be quick.
      await recomputeAllScoring();
      revalidatePath("/admin/reglas");
      revalidatePath("/ranking");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}
