"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { specialPredictions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { recomputeSpecialPredictionForAllUsers } from "@/lib/scoring/persistence";
import { runAction } from "@/lib/actions/guard";

export type FormState = { ok: boolean; error?: string };

const resolveSchema = z.object({
  specialId: z.coerce.number().int(),
  resolvedJson: z.string().min(1),
  clear: z.coerce.boolean().default(false),
});

export async function resolveSpecial(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = resolveSchema.safeParse({
    specialId: formData.get("specialId"),
    resolvedJson: formData.get("resolvedJson") ?? "{}",
    clear: formData.get("clear") === "1",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Validamos/parseamos el JSON resuelto ANTES del wrapper para devolver su
  // mensaje específico (no el genérico de BD).
  let parsedValue: unknown;
  if (!parsed.data.clear) {
    try {
      parsedValue = JSON.parse(parsed.data.resolvedJson);
    } catch {
      return { ok: false, error: "El valor resuelto no es JSON válido." };
    }
  }

  return runAction(
    { action: "resolveSpecial", userId: me.id },
    async () => {
      if (parsed.data.clear) {
        await db
          .update(specialPredictions)
          .set({ resolvedValueJson: null, resolvedAt: null })
          .where(eq(specialPredictions.id, parsed.data.specialId));
        await logAdminAction({
          adminId: me.id,
          action: "special.unresolve",
          payload: { specialId: parsed.data.specialId },
        });
      } else {
        await db
          .update(specialPredictions)
          .set({ resolvedValueJson: parsedValue as unknown, resolvedAt: new Date() })
          .where(eq(specialPredictions.id, parsed.data.specialId));
        await logAdminAction({
          adminId: me.id,
          action: "special.resolve",
          payload: { specialId: parsed.data.specialId, value: parsedValue },
        });
      }

      await recomputeSpecialPredictionForAllUsers(parsed.data.specialId);
      revalidatePath("/admin/especiales");
      revalidatePath("/ranking");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}

const upsertSchema = z.object({
  id: z.coerce.number().int().optional(),
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos."),
  question: z.string().min(2).max(200),
  type: z.enum(["yes_no", "single_choice", "team_with_round", "number_range", "player"]),
  optionsJson: z.string().optional(),
  pointsConfigJson: z.string().min(2),
  closesAt: z.string().min(1),
});

export async function upsertSpecial(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = upsertSchema.safeParse({
    id: formData.get("id") || undefined,
    key: formData.get("key"),
    question: formData.get("question"),
    type: formData.get("type"),
    optionsJson: formData.get("optionsJson") || undefined,
    pointsConfigJson: formData.get("pointsConfigJson"),
    closesAt: formData.get("closesAt"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let optionsJson: unknown = null;
  if (parsed.data.optionsJson && parsed.data.optionsJson.trim() !== "") {
    try {
      optionsJson = JSON.parse(parsed.data.optionsJson);
    } catch {
      return { ok: false, error: "Opciones JSON inválido." };
    }
  }
  let pointsConfigJson: unknown;
  try {
    pointsConfigJson = JSON.parse(parsed.data.pointsConfigJson);
  } catch {
    return { ok: false, error: "Puntos JSON inválido." };
  }

  const data = {
    key: parsed.data.key,
    question: parsed.data.question,
    type: parsed.data.type,
    optionsJson: optionsJson as unknown,
    pointsConfigJson: pointsConfigJson as unknown,
    closesAt: new Date(parsed.data.closesAt),
  };

  return runAction(
    { action: "upsertSpecial", userId: me.id },
    async () => {
      if (parsed.data.id) {
        await db
          .update(specialPredictions)
          .set(data)
          .where(eq(specialPredictions.id, parsed.data.id));
        await logAdminAction({
          adminId: me.id,
          action: "special.update",
          payload: { id: parsed.data.id },
        });
      } else {
        // Auto-pick the next orderIndex
        const [{ next }] = await db
          .select({ next: sql<number>`coalesce(max(${specialPredictions.orderIndex}), 0)::int + 1` })
          .from(specialPredictions);
        const [created] = await db
          .insert(specialPredictions)
          .values({ ...data, orderIndex: next })
          .returning();
        await logAdminAction({
          adminId: me.id,
          action: "special.create",
          payload: { id: created.id, key: parsed.data.key },
        });
      }
      revalidatePath("/admin/especiales");
      revalidatePath("/predicciones/especiales");
      return { ok: true };
    },
    (error) => ({ ok: false, error }),
  );
}

export async function deleteSpecial(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.delete(specialPredictions).where(eq(specialPredictions.id, id));
  await logAdminAction({
    adminId: me.id,
    action: "special.delete",
    payload: { id },
  });
  revalidatePath("/admin/especiales");
  revalidatePath("/predicciones/especiales");
}
