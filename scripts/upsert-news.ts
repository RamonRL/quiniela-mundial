import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { newsArticles } from "@/lib/db/schema";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Inserta o actualiza un artículo de noticia desde un JSON.
 * Pensado para usarse desde el slash command
 * `/noticia-convocatoria-qm CODE` — Claude redacta, escribe el JSON
 * y dispara este script.
 *
 * UPSERT por slug:
 *   - Si el slug existe: UPDATE de contenido editorial. No toca
 *     `coverUrl`/`coverAlt` salvo que se pase `--force-cover` o que
 *     el artículo aún no tenga cover (entonces sí sube).
 *   - Si no existe: INSERT con status="published" y publishedAt=now()
 *     (o el `publishedAt` que indique el JSON).
 *
 * Cover automático:
 *   - Si el JSON declara `coverFile`, lo sube al bucket `news` con
 *     path `<slug>-<timestamp>.<ext>`.
 *   - Si no, intenta `noticias/convocatorias/<RELATED_TEAM>.png`
 *     usando el primer `relatedTeamCodes`. Si no existe, no es
 *     error — simplemente no asigna cover.
 *
 * Formato del JSON (todos los campos obligatorios salvo los marcados):
 *   {
 *     "slug": "convocatoria-alemania-...",
 *     "title": "...",
 *     "seoTitle": "..." (opcional, max 70),
 *     "excerpt": "...",
 *     "body": "markdown",
 *     "category": "convocatoria" | "previa" | "cronica" | ... ,
 *     "tags": ["..."],
 *     "relatedTeamCodes": ["GER"],
 *     "relatedMatchId": null (opcional),
 *     "publishedAt": "ISO datetime" (opcional, default now()),
 *     "coverFile": "ruta/local.png" (opcional — si no se indica
 *                  intenta `noticias/convocatorias/<CODE>.png`),
 *     "coverAlt": "..." (opcional, default "<País> · convocatoria
 *                        para el Mundial 2026")
 *   }
 *
 * Uso:
 *   pnpm db:upsert-news path/to/news.json
 *   pnpm db:upsert-news path/to/news.json --dry-run
 *   pnpm db:upsert-news path/to/news.json --force-cover
 */

const NEWS_CATEGORIES = [
  "convocatoria",
  "previa",
  "cronica",
  "analisis",
  "lesion",
  "sorteo",
  "destacada",
] as const;

const NewsSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "slug: solo minúsculas, números y guiones",
    ),
  title: z.string().min(5).max(140),
  seoTitle: z.string().max(70).optional(),
  excerpt: z.string().min(20).max(280),
  body: z.string().min(50),
  category: z.enum(NEWS_CATEGORIES),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  relatedTeamCodes: z.array(z.string().min(2).max(4)).max(10).default([]),
  relatedMatchId: z.number().int().positive().nullable().optional(),
  publishedAt: z.string().datetime().optional(),
  coverFile: z.string().optional(),
  coverAlt: z.string().max(200).optional(),
});

async function locateCover(
  declared: string | undefined,
  relatedCode: string | undefined,
): Promise<string | null> {
  const candidates: string[] = [];
  if (declared) candidates.push(path.resolve(declared));
  if (relatedCode) {
    candidates.push(
      path.join(process.cwd(), "noticias", "convocatorias", `${relatedCode}.png`),
      path.join(process.cwd(), "noticias", "convocatorias", `${relatedCode}.jpg`),
    );
  }
  for (const c of candidates) {
    try {
      await readFile(c);
      return c;
    } catch {
      // sigue probando
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const forceCover = args.includes("--force-cover");
  const filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath) {
    console.error("Uso: tsx scripts/upsert-news.ts <ruta.json> [--dry-run] [--force-cover]");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf-8");
  let parsed: z.infer<typeof NewsSchema>;
  try {
    parsed = NewsSchema.parse(JSON.parse(raw));
  } catch (err) {
    console.error("✗ JSON inválido:", err);
    process.exit(1);
  }

  const existing = await db
    .select({
      id: newsArticles.id,
      coverUrl: newsArticles.coverUrl,
    })
    .from(newsArticles)
    .where(eq(newsArticles.slug, parsed.slug))
    .limit(1);
  const isUpdate = existing.length > 0;
  const article = existing[0];

  console.log(
    `→ ${isUpdate ? "Actualizando" : "Creando"} artículo: ${parsed.slug} ${dryRun ? "(DRY-RUN)" : ""}`,
  );

  // Localizar cover. Solo subimos si:
  //   - es INSERT y hay archivo localizable, o
  //   - es UPDATE pero el artículo no tiene cover aún, o
  //   - --force-cover.
  const relatedCode = parsed.relatedTeamCodes[0];
  const localCover = await locateCover(parsed.coverFile, relatedCode);
  const shouldUploadCover =
    localCover != null && (!isUpdate || !article!.coverUrl || forceCover);
  let coverUrl: string | undefined;
  let coverAlt: string | undefined;
  if (shouldUploadCover && localCover) {
    coverAlt = parsed.coverAlt;
    if (!coverAlt && relatedCode) {
      coverAlt = `${relatedCode} · convocatoria para el Mundial 2026`;
    }
    const ext = path.extname(localCover).toLowerCase().slice(1);
    const remotePath = `${parsed.slug}-${Date.now()}.${ext}`;
    const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    console.log(`  ↗ Cover: ${path.relative(process.cwd(), localCover)} → news/${remotePath}`);
    if (!dryRun) {
      const supabase = createSupabaseServiceClient();
      const buffer = await readFile(localCover);
      const { error } = await supabase.storage
        .from("news")
        .upload(remotePath, buffer, { contentType, upsert: true });
      if (error) {
        console.error(`  ✗ Falló subida del cover: ${error.message}`);
        process.exit(1);
      }
      const { data } = supabase.storage.from("news").getPublicUrl(remotePath);
      coverUrl = data.publicUrl;
    } else {
      coverUrl = "(dry-run)";
    }
  } else if (localCover && isUpdate && article!.coverUrl && !forceCover) {
    console.log(
      `  ↷ Cover encontrado pero el artículo ya tiene uno (usa --force-cover para pisar).`,
    );
  } else if (!localCover) {
    console.log(`  ↷ Sin cover localizable. Probadas: declared=${parsed.coverFile ?? "—"}, convocatorias/${relatedCode ?? "—"}.png`);
  }

  const now = new Date();
  const publishedAt = parsed.publishedAt ? new Date(parsed.publishedAt) : now;

  if (dryRun) {
    console.log(`  · title:    ${parsed.title}`);
    console.log(`  · category: ${parsed.category}`);
    console.log(`  · tags:     [${parsed.tags.join(", ")}]`);
    console.log(`  · teams:    [${parsed.relatedTeamCodes.join(", ")}]`);
    console.log(`  · body:     ${parsed.body.length} chars`);
    console.log(`✔ Dry-run completo. Nada escrito en DB.`);
    process.exit(0);
  }

  if (isUpdate) {
    await db
      .update(newsArticles)
      .set({
        title: parsed.title,
        seoTitle: parsed.seoTitle ?? null,
        excerpt: parsed.excerpt,
        body: parsed.body,
        category: parsed.category,
        tags: parsed.tags,
        relatedTeamCodes: parsed.relatedTeamCodes,
        relatedMatchId: parsed.relatedMatchId ?? null,
        ...(coverUrl != null && coverAlt != null
          ? { coverUrl, coverAlt }
          : {}),
        updatedAt: now,
      })
      .where(eq(newsArticles.id, article!.id));
    console.log(`✔ Actualizado: ${parsed.slug}`);
  } else {
    await db.insert(newsArticles).values({
      slug: parsed.slug,
      title: parsed.title,
      seoTitle: parsed.seoTitle ?? null,
      excerpt: parsed.excerpt,
      body: parsed.body,
      coverUrl: coverUrl ?? null,
      coverAlt: coverAlt ?? null,
      category: parsed.category,
      tags: parsed.tags,
      relatedTeamCodes: parsed.relatedTeamCodes,
      relatedMatchId: parsed.relatedMatchId ?? null,
      authorId: null,
      status: "published" as const,
      publishedAt,
      updatedAt: now,
    });
    console.log(`✔ Creado: ${parsed.slug}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
