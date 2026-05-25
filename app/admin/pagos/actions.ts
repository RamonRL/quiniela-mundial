"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pendingPayments } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";

const updateSchema = z.object({
  id: z.coerce.number().int(),
  status: z.enum(["pending", "verified", "rejected"]),
  notes: z.string().trim().max(2000).optional(),
});

export type UpdateResult = { ok: boolean; error?: string };

export async function updatePendingPayment(
  formData: FormData,
): Promise<UpdateResult> {
  await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  await db
    .update(pendingPayments)
    .set({
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(pendingPayments.id, parsed.data.id));
  revalidatePath("/admin/pagos");
  return { ok: true };
}
