"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, asc, eq, gt, lt, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, leagueSponsors, leagues } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { deleteImage, uploadImage } from "@/lib/storage";
import { GLOBAL_BANNER_KEY, SPONSORS_TAG, loadGlobalBannerRaw } from "@/lib/sponsors";

/** Invalida la caché de `loadEffectiveSponsors` (dashboard/ranking/predicciones)
 * y las páginas estáticas que listan patrocinadores. */
function revalidateSponsors() {
  revalidateTag(SPONSORS_TAG);
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/dashboard");
}

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
  revalidateSponsors();
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
  revalidateSponsors();
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
  revalidateSponsors();
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
  revalidateSponsors();
  return { ok: true, message: url ? "Enlace guardado." : "Enlace quitado." };
}

function revalidateSponsorPlacements() {
  revalidateTag(SPONSORS_TAG);
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");
  revalidatePath("/predicciones");
}

/**
 * Guarda/actualiza el BANNER DE AFILIADO GLOBAL (en app_settings). Se muestra
 * en todas las quinielas —públicas y privadas— que aún NO tengan patrocinador
 * propio. Las que ya tienen el suyo no lo ven.
 */
export async function saveGlobalBanner(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const alt = String(formData.get("alt") ?? "").trim() || null;
  const enabled = formData.get("enabled") === "on";
  const { url: linkUrl, error: linkErr } = normalizeLink(String(formData.get("link") ?? ""));
  if (linkErr) return { ok: false, error: linkErr };
  const file = formData.get("logo");

  const existing = await loadGlobalBannerRaw();
  let imageUrl = existing?.imageUrl ?? "";
  let storagePath = existing?.storagePath ?? "";

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return { ok: false, error: "El banner supera 2 MB." };
    if (file.type && !ALLOWED.includes(file.type)) {
      return { ok: false, error: "Formato no soportado (usa PNG, JPG, WEBP o SVG)." };
    }
    const path = `global/${crypto.randomUUID()}.${extFor(file)}`;
    imageUrl = await uploadImage({ kind: "sponsor", path, file });
    if (existing?.storagePath) await deleteImage({ kind: "sponsor", path: existing.storagePath }).catch(() => {});
    storagePath = path;
  }

  if (!imageUrl) return { ok: false, error: "Sube una imagen para el banner." };

  const value = { imageUrl, storagePath, alt, linkUrl, enabled };
  await db
    .insert(appSettings)
    .values({ key: GLOBAL_BANNER_KEY, valueJson: value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueJson: value, updatedAt: new Date() },
    });

  await logAdminAction({
    adminId: me.id,
    action: "sponsor.global_save",
    payload: { enabled, hasLink: !!linkUrl },
  });
  revalidateSponsorPlacements();
  return {
    ok: true,
    message: enabled
      ? "Banner global guardado y activo en las quinielas sin patrocinador."
      : "Banner global guardado (desactivado).",
  };
}

/** Elimina el banner de afiliado global (imagen + ajuste). */
export async function deleteGlobalBanner(): Promise<ActionResult> {
  const me = await requireAdmin();
  const existing = await loadGlobalBannerRaw();
  if (existing?.storagePath) {
    await deleteImage({ kind: "sponsor", path: existing.storagePath }).catch(() => {});
  }
  await db.delete(appSettings).where(eq(appSettings.key, GLOBAL_BANNER_KEY));
  await logAdminAction({ adminId: me.id, action: "sponsor.global_delete", payload: {} });
  revalidateSponsorPlacements();
  return { ok: true, message: "Banner global eliminado." };
}
