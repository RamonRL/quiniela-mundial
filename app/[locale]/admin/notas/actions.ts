"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { patchNotes } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { runAction } from "@/lib/actions/guard";

export type PatchNoteFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const TYPES = ["feature", "fix", "improvement", "note"] as const;

const upsertSchema = z.object({
  id: z.coerce.number().int().optional(),
  type: z.enum(TYPES),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1).max(2000),
  /** "1" / "0" como checkbox del form. */
  publish: z.coerce.boolean().default(false),
});

/**
 * Crea una nota nueva. Si `publish === true`, queda visible en el dashboard
 * inmediatamente (publishedAt = now). Si no, queda en borrador.
 */
export async function createPatchNote(
  _prev: PatchNoteFormState,
  formData: FormData,
): Promise<PatchNoteFormState> {
  const me = await requireAdmin();
  const parsed = upsertSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    body: formData.get("body"),
    publish: formData.get("publish"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  return runAction(
    { action: "createPatchNote", userId: me.id },
    async () => {
      const [created] = await db
        .insert(patchNotes)
        .values({
          type: parsed.data.type,
          title: parsed.data.title,
          body: parsed.data.body,
          publishedAt: parsed.data.publish ? new Date() : null,
        })
        .returning({ id: patchNotes.id });
      await logAdminAction({
        adminId: me.id,
        action: "patch_note.create",
        payload: { id: created.id, type: parsed.data.type, published: parsed.data.publish },
      });
      revalidatePath("/admin/notas");
      revalidatePath("/dashboard");
      return { ok: true, message: "Nota creada." };
    },
    (error) => ({ ok: false, error }),
  );
}

/** Edita una nota existente. Permite cambiar tipo, título, cuerpo y publish flag. */
export async function updatePatchNote(
  _prev: PatchNoteFormState,
  formData: FormData,
): Promise<PatchNoteFormState> {
  const me = await requireAdmin();
  const parsed = upsertSchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    title: formData.get("title"),
    body: formData.get("body"),
    publish: formData.get("publish"),
  });
  if (!parsed.success || parsed.data.id == null) {
    return { ok: false, error: parsed.error?.issues[0]?.message ?? "Datos inválidos" };
  }
  const id = parsed.data.id;
  return runAction(
    { action: "updatePatchNote", userId: me.id },
    async () => {
      // Si el flag publish viene desactivado, deshacemos publicación
      // (publishedAt = null). Si viene activado y antes no había, lo
      // marcamos AHORA — no preservamos la fecha original para mantenerlo
      // simple: el "update" empuja la nota al top del listado público.
      await db
        .update(patchNotes)
        .set({
          type: parsed.data.type,
          title: parsed.data.title,
          body: parsed.data.body,
          publishedAt: parsed.data.publish ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(patchNotes.id, id));
      await logAdminAction({
        adminId: me.id,
        action: "patch_note.update",
        payload: { id, type: parsed.data.type, published: parsed.data.publish },
      });
      revalidatePath("/admin/notas");
      revalidatePath("/dashboard");
      return { ok: true, message: "Nota actualizada." };
    },
    (error) => ({ ok: false, error }),
  );
}

/** Borra una nota — irreversible. */
export async function deletePatchNote(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.delete(patchNotes).where(eq(patchNotes.id, id));
  await logAdminAction({
    adminId: me.id,
    action: "patch_note.delete",
    payload: { id },
  });
  revalidatePath("/admin/notas");
  revalidatePath("/dashboard");
}
