"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { uploadImage } from "@/lib/storage";
import { normalizePosition } from "@/lib/position";

export type FormState = { ok: boolean; error?: string };

const upsertSchema = z.object({
  id: z.coerce.number().int().optional(),
  teamId: z.coerce.number().int(),
  name: z.string().min(2).max(80),
  position: z.string().max(20).optional().nullable(),
  jerseyNumber: z
    .union([z.coerce.number().int().min(1).max(99), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export async function upsertPlayer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = upsertSchema.safeParse({
    id: formData.get("id") || undefined,
    teamId: formData.get("teamId"),
    name: formData.get("name"),
    position: formData.get("position") ?? null,
    jerseyNumber: formData.get("jerseyNumber") ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Resolve team code for storage path.
  const [team] = await db
    .select({ code: teams.code })
    .from(teams)
    .where(eq(teams.id, parsed.data.teamId))
    .limit(1);
  if (!team) return { ok: false, error: "Selección no encontrada." };

  const photo = formData.get("photo");
  let photoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    photoUrl = await uploadImage({
      kind: "player",
      path: `${team.code}/${slug}-${Date.now()}.png`,
      file: photo,
    });
  }

  const data: Record<string, unknown> = {
    teamId: parsed.data.teamId,
    name: parsed.data.name,
    position: normalizePosition(parsed.data.position),
    jerseyNumber: parsed.data.jerseyNumber ?? null,
  };
  if (photoUrl) data.photoUrl = photoUrl;

  if (parsed.data.id) {
    await db.update(players).set(data).where(eq(players.id, parsed.data.id));
    await logAdminAction({
      adminId: me.id,
      action: "player.update",
      payload: { id: parsed.data.id },
    });
  } else {
    const [created] = await db.insert(players).values(data as typeof players.$inferInsert).returning();
    await logAdminAction({
      adminId: me.id,
      action: "player.create",
      payload: { id: created.id, teamId: parsed.data.teamId },
    });
  }

  revalidatePath("/admin/jugadores");
  return { ok: true };
}

export async function deletePlayer(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.delete(players).where(eq(players.id, id));
  await logAdminAction({ adminId: me.id, action: "player.delete", payload: { id } });
  revalidatePath("/admin/jugadores");
}

const importSchema = z.object({
  teamId: z.coerce.number().int(),
  payload: z.string().min(1),
});

/**
 * Bulk import players from a pasted CSV/TSV/newline-separated list.
 *
 * Accepted formats per line (in order, comma- or tab-separated):
 *   - "name"
 *   - "name, jersey"
 *   - "name, jersey, position"
 *   - "name; jersey; position"  (semicolons also accepted)
 */
export async function importPlayers(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = importSchema.safeParse({
    teamId: formData.get("teamId"),
    payload: formData.get("payload"),
  });
  if (!parsed.success) return { ok: false, error: "Pega al menos un jugador." };

  const lines = parsed.data.payload
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, error: "Sin líneas que procesar." };

  const rows: { teamId: number; name: string; jerseyNumber: number | null; position: string | null }[] = [];
  for (const line of lines) {
    const cols = line.split(/[\t,;]/).map((c) => c.trim());
    const name = cols[0];
    if (!name) continue;
    const jerseyRaw = cols[1];
    const jersey = jerseyRaw && /^\d+$/.test(jerseyRaw) ? Number(jerseyRaw) : null;
    const position = normalizePosition(cols[2] || null);
    rows.push({ teamId: parsed.data.teamId, name, jerseyNumber: jersey, position });
  }
  if (rows.length === 0) return { ok: false, error: "No se pudo parsear ninguna línea." };

  await db.insert(players).values(rows);
  await logAdminAction({
    adminId: me.id,
    action: "player.import",
    payload: { teamId: parsed.data.teamId, count: rows.length },
  });
  revalidatePath("/admin/jugadores");
  return { ok: true };
}
