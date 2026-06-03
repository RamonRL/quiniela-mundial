"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { deleteImage, uploadImage } from "@/lib/storage";

const createSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(3)
    .transform((s) => s.toUpperCase()),
  name: z.string().min(2).max(60),
  groupId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : null)),
});

export type FormState = { ok: boolean; error?: string };

export async function createTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = createSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    groupId: formData.get("groupId") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const flagFile = formData.get("flag");
  let flagUrl: string | null = null;
  if (flagFile instanceof File && flagFile.size > 0) {
    flagUrl = await uploadImage({
      kind: "flag",
      path: `${parsed.data.code}.png`,
      file: flagFile,
    });
  }
  const [created] = await db
    .insert(teams)
    .values({
      code: parsed.data.code,
      name: parsed.data.name,
      groupId: parsed.data.groupId,
      flagUrl,
    })
    .returning();
  await logAdminAction({
    adminId: me.id,
    action: "team.create",
    payload: { teamId: created.id, code: parsed.data.code },
  });
  revalidatePath("/admin/selecciones");
  revalidatePath("/grupos");
  return { ok: true };
}

const updateSchema = createSchema.extend({ id: z.coerce.number() });

export async function updateTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    groupId: formData.get("groupId") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const flagFile = formData.get("flag");
  const updateData: Record<string, unknown> = {
    code: parsed.data.code,
    name: parsed.data.name,
    groupId: parsed.data.groupId,
  };
  if (flagFile instanceof File && flagFile.size > 0) {
    updateData.flagUrl = await uploadImage({
      kind: "flag",
      path: `${parsed.data.code}.png`,
      file: flagFile,
    });
  }
  await db.update(teams).set(updateData).where(eq(teams.id, parsed.data.id));
  await logAdminAction({
    adminId: me.id,
    action: "team.update",
    payload: { teamId: parsed.data.id },
  });
  revalidatePath("/admin/selecciones");
  revalidatePath("/grupos");
  return { ok: true };
}

export async function deleteTeam(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  if (!team) return;
  await db.delete(teams).where(eq(teams.id, id));
  if (team.flagUrl) {
    try {
      await deleteImage({ kind: "flag", path: `${team.code}.png` });
    } catch {
      // best effort
    }
  }
  await logAdminAction({
    adminId: me.id,
    action: "team.delete",
    payload: { teamId: id, code: team.code },
  });
  revalidatePath("/admin/selecciones");
}
