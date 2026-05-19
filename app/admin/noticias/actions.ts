"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { newsArticles, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { uploadImage } from "@/lib/storage";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NEWS_CATEGORIES = [
  "convocatoria",
  "previa",
  "cronica",
  "analisis",
  "lesion",
  "sorteo",
  "destacada",
] as const;

const NEWS_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

const upsertSchema = z.object({
  id: z.coerce.number().int().optional(),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(SLUG_RE, "Solo minúsculas, números y guiones."),
  title: z.string().min(5).max(140),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  excerpt: z.string().min(20).max(280),
  body: z.string().min(50),
  coverUrl: z.string().url().optional().or(z.literal("")),
  coverAlt: z.string().max(200).optional().or(z.literal("")),
  category: z.enum(NEWS_CATEGORIES),
  // Tags y teams llegan en formato "ESP,MAR,ESP" — los normalizamos.
  tags: z.string().max(500).optional().or(z.literal("")),
  relatedTeamCodes: z.string().max(500).optional().or(z.literal("")),
  // El <select> envía "" cuando el admin elige "— ninguno —". z.coerce.number()
  // convertiría "" a 0 → violación de FK contra matches.id. Preprocesamos
  // a undefined antes de coercer y exigimos positivo cuando sí hay valor.
  relatedMatchId: z
    .preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().int().positive(),
    )
    .optional(),
  status: z.enum(NEWS_STATUSES),
  publishedAt: z.string().optional().or(z.literal("")),
});

export type FormState = { ok: boolean; error?: string; id?: number };

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function csvToArray(csv: string | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Crea o actualiza un artículo. Si llega `cover` (File) lo subimos a
 * `news/<slug>.<ext>` y guardamos la URL. Si status=published y
 * publishedAt está vacío, lo fijamos a now() para que la fecha de
 * publicación quede consistente con cuando se publicó.
 */
export async function upsertArticle(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();

  // Slug autoderivado si no se pasa explícito.
  const titleRaw = String(formData.get("title") ?? "");
  let slugRaw = String(formData.get("slug") ?? "").trim();
  if (!slugRaw) slugRaw = slugify(titleRaw);

  const parsed = upsertSchema.safeParse({
    id: formData.get("id"),
    slug: slugRaw,
    title: titleRaw,
    seoTitle: formData.get("seoTitle"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    coverUrl: formData.get("coverUrl"),
    coverAlt: formData.get("coverAlt"),
    category: formData.get("category"),
    tags: formData.get("tags"),
    relatedTeamCodes: formData.get("relatedTeamCodes"),
    relatedMatchId: formData.get("relatedMatchId"),
    status: formData.get("status"),
    publishedAt: formData.get("publishedAt"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const data = parsed.data;

  // Cover upload — opcional. Si llega y es un File válido, lo subimos.
  let coverUrl: string | null = data.coverUrl?.trim() ? data.coverUrl : null;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    if (cover.size > 5 * 1024 * 1024) {
      return { ok: false, error: "La portada no debe pesar más de 5 MB." };
    }
    const ext = cover.type === "image/png" ? "png" : "jpg";
    const path = `${data.slug}-${Date.now()}.${ext}`;
    coverUrl = await uploadImage({ kind: "news", path, file: cover });
  }

  // Normalizar tags y team codes (uppercase para teams para case-insensitive).
  const tagsArr = csvToArray(data.tags ?? "");
  const teamCodesArr = csvToArray(data.relatedTeamCodes ?? "").map((c) =>
    c.toUpperCase(),
  );

  // Validar que los codes de equipo existen.
  if (teamCodesArr.length > 0) {
    const existing = await db
      .select({ code: teams.code })
      .from(teams);
    const known = new Set(existing.map((t) => t.code));
    const bad = teamCodesArr.filter((c) => !known.has(c));
    if (bad.length > 0) {
      return { ok: false, error: `Códigos de equipo desconocidos: ${bad.join(", ")}` };
    }
  }

  // publishedAt: si status=published y no hay valor, usar ahora.
  let publishedAt: Date | null = null;
  if (data.publishedAt && data.publishedAt.length > 0) {
    const d = new Date(data.publishedAt);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Fecha de publicación inválida." };
    }
    publishedAt = d;
  } else if (data.status === "published" || data.status === "scheduled") {
    publishedAt = new Date();
  }

  const values = {
    slug: data.slug,
    title: data.title,
    seoTitle: data.seoTitle?.trim() ? data.seoTitle : null,
    excerpt: data.excerpt,
    body: data.body,
    coverUrl,
    coverAlt: data.coverAlt?.trim() ? data.coverAlt : null,
    category: data.category,
    tags: tagsArr,
    relatedTeamCodes: teamCodesArr,
    relatedMatchId: data.relatedMatchId ?? null,
    authorId: me.id,
    status: data.status,
    publishedAt,
    updatedAt: new Date(),
  };

  let articleId: number;
  if (data.id) {
    // Check slug not collides with a different article.
    const collision = await db
      .select({ id: newsArticles.id })
      .from(newsArticles)
      .where(eq(newsArticles.slug, data.slug))
      .limit(1);
    if (collision[0] && collision[0].id !== data.id) {
      return { ok: false, error: `El slug "${data.slug}" ya existe.` };
    }
    await db
      .update(newsArticles)
      .set(values)
      .where(eq(newsArticles.id, data.id));
    articleId = data.id;
    await logAdminAction({
      adminId: me.id,
      action: "news.update",
      payload: { id: data.id, slug: data.slug, status: data.status },
    });
  } else {
    const collision = await db
      .select({ id: newsArticles.id })
      .from(newsArticles)
      .where(eq(newsArticles.slug, data.slug))
      .limit(1);
    if (collision[0]) {
      return { ok: false, error: `El slug "${data.slug}" ya existe.` };
    }
    const [inserted] = await db
      .insert(newsArticles)
      .values(values)
      .returning({ id: newsArticles.id });
    articleId = inserted.id;
    await logAdminAction({
      adminId: me.id,
      action: "news.create",
      payload: { id: articleId, slug: data.slug, status: data.status },
    });
  }

  revalidatePath("/admin/noticias");
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${data.slug}`);
  revalidatePath(`/noticias/categoria/${data.category}`);
  revalidatePath("/");
  return { ok: true, id: articleId };
}

const setStatusSchema = z.object({
  id: z.coerce.number().int(),
  status: z.enum(NEWS_STATUSES),
});

export async function setArticleStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireAdmin();
  const parsed = setStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const next: Record<string, unknown> = {
    status: parsed.data.status,
    updatedAt: new Date(),
  };
  // Si pasamos a published y aún no había publishedAt, lo fijamos a ahora.
  if (parsed.data.status === "published") {
    const [row] = await db
      .select({ publishedAt: newsArticles.publishedAt, slug: newsArticles.slug })
      .from(newsArticles)
      .where(eq(newsArticles.id, parsed.data.id))
      .limit(1);
    if (!row) return { ok: false, error: "Artículo no encontrado." };
    if (!row.publishedAt) next.publishedAt = new Date();
    revalidatePath(`/noticias/${row.slug}`);
  }
  await db
    .update(newsArticles)
    .set(next)
    .where(eq(newsArticles.id, parsed.data.id));
  await logAdminAction({
    adminId: me.id,
    action: `news.status.${parsed.data.status}`,
    payload: { id: parsed.data.id },
  });
  revalidatePath("/admin/noticias");
  revalidatePath("/noticias");
  revalidatePath("/");
  return { ok: true, id: parsed.data.id };
}

export async function deleteArticle(formData: FormData) {
  const me = await requireAdmin();
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isFinite(id)) return;
  const [row] = await db
    .select({ slug: newsArticles.slug })
    .from(newsArticles)
    .where(eq(newsArticles.id, id))
    .limit(1);
  await db.delete(newsArticles).where(eq(newsArticles.id, id));
  await logAdminAction({
    adminId: me.id,
    action: "news.delete",
    payload: { id, slug: row?.slug },
  });
  revalidatePath("/admin/noticias");
  revalidatePath("/noticias");
  redirect("/admin/noticias");
}
