"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, gt, lt, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueSponsors, leagues } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { deleteImage, uploadImage } from "@/lib/storage";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function extFor(file: File): string {
  if (file.type === "image/svg+xml") return "svg";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  return "png";
}

/** Normaliza el enlace de destino: "" → null; sin esquema añade https://. */
function normalizeLink(raw: string): { url: string | null; error?: string } {
  const v = raw.trim();
  if (!v) return { url: null };
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { url: null, error: "El enlace debe ser http(s)." };
    }
    return { url: u.toString() };
  } catch {
    return { url: null, error: "Enlace no válido." };
  }
}

/** Sube un logo de patrocinador a una liga (al final de la fila). */
export async function addSponsor(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const leagueId = Number(formData.get("leagueId"));
  const alt = String(formData.get("alt") ?? "").trim() || null;
  const file = formData.get("logo");
  const { url: linkUrl, error: linkErr } = normalizeLink(String(formData.get("link") ?? ""));
  if (linkErr) return { ok: false, error: linkErr };

  if (!Number.isFinite(leagueId) || leagueId <= 0) {
    return { ok: false, error: "Liga no válida." };
  }
  const [league] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return { ok: false, error: "La liga no existe." };

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Sube un archivo de imagen." };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "El logo supera 2 MB." };
  if (file.type && !ALLOWED.includes(file.type)) {
    return { ok: false, error: "Formato no soportado (usa PNG, JPG, WEBP o SVG)." };
  }

  const path = `league-${leagueId}/${crypto.randomUUID()}.${extFor(file)}`;
  const imageUrl = await uploadImage({ kind: "sponsor", path, file });

  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${leagueSponsors.orderIndex}), -1)::int` })
    .from(leagueSponsors)
    .where(eq(leagueSponsors.leagueId, leagueId));
  const nextOrder = (maxRow?.max ?? -1) + 1;

  await db.insert(leagueSponsors).values({
    leagueId,
    imageUrl,
    storagePath: path,
    alt,
    linkUrl,
    orderIndex: nextOrder,
  });

  await logAdminAction({
    adminId: me.id,
    action: "sponsor.add",
    payload: { leagueId, path, alt, linkUrl },
  });
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/dashboard");
  return { ok: true, message: "Logo añadido." };
}

/** Elimina un logo (borra el objeto del bucket y la fila). */
export async function deleteSponsor(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { ok: false, error: "Id no válido." };

  const [row] = await db
    .select({ leagueId: leagueSponsors.leagueId, storagePath: leagueSponsors.storagePath })
    .from(leagueSponsors)
    .where(eq(leagueSponsors.id, id))
    .limit(1);
  if (!row) return { ok: false, error: "No encontrado." };

  await deleteImage({ kind: "sponsor", path: row.storagePath }).catch(() => {});
  await db.delete(leagueSponsors).where(eq(leagueSponsors.id, id));

  await logAdminAction({ adminId: me.id, action: "sponsor.delete", payload: { id, leagueId: row.leagueId } });
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/dashboard");
  return { ok: true, message: "Logo eliminado." };
}

/** Reordena un logo intercambiándolo con su vecino (izquierda/derecha). */
export async function moveSponsor(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  const dir = String(formData.get("dir"));
  if (!Number.isFinite(id) || (dir !== "up" && dir !== "down")) {
    return { ok: false, error: "Datos no válidos." };
  }

  const [self] = await db
    .select({ id: leagueSponsors.id, leagueId: leagueSponsors.leagueId, orderIndex: leagueSponsors.orderIndex })
    .from(leagueSponsors)
    .where(eq(leagueSponsors.id, id))
    .limit(1);
  if (!self) return { ok: false, error: "No encontrado." };

  // Vecino inmediato en la dirección pedida (up = orderIndex menor).
  const [neighbor] = await db
    .select({ id: leagueSponsors.id, orderIndex: leagueSponsors.orderIndex })
    .from(leagueSponsors)
    .where(
      and(
        eq(leagueSponsors.leagueId, self.leagueId),
        dir === "up"
          ? lt(leagueSponsors.orderIndex, self.orderIndex)
          : gt(leagueSponsors.orderIndex, self.orderIndex),
      ),
    )
    .orderBy(dir === "up" ? desc(leagueSponsors.orderIndex) : asc(leagueSponsors.orderIndex))
    .limit(1);
  if (!neighbor) return { ok: true }; // ya está en el extremo.

  await db.transaction(async (tx) => {
    await tx.update(leagueSponsors).set({ orderIndex: neighbor.orderIndex }).where(eq(leagueSponsors.id, self.id));
    await tx.update(leagueSponsors).set({ orderIndex: self.orderIndex }).where(eq(leagueSponsors.id, neighbor.id));
  });

  await logAdminAction({ adminId: me.id, action: "sponsor.move", payload: { id, dir } });
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Fija/edita el enlace de destino de un patrocinador (enlace de afiliado). */
export async function updateSponsorLink(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { ok: false, error: "Id no válido." };
  const { url, error } = normalizeLink(String(formData.get("link") ?? ""));
  if (error) return { ok: false, error };

  const [row] = await db
    .select({ id: leagueSponsors.id })
    .from(leagueSponsors)
    .where(eq(leagueSponsors.id, id))
    .limit(1);
  if (!row) return { ok: false, error: "No encontrado." };

  await db.update(leagueSponsors).set({ linkUrl: url }).where(eq(leagueSponsors.id, id));
  await logAdminAction({ adminId: me.id, action: "sponsor.link", payload: { id, hasLink: !!url } });
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/dashboard");
  return { ok: true, message: url ? "Enlace guardado." : "Enlace quitado." };
}
