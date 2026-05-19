import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles } from "@/lib/db/schema";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Reconcilia coverUrl de news_articles con los archivos que viven en
 * el bucket `news`. El upload del admin guarda con path
 * `${slug}-${timestamp}.{png|jpg|webp}`, así que para cada artículo
 * buscamos el fichero más reciente que empieza por su slug y le
 * regrabamos la URL pública.
 *
 * Recovery de emergencia tras la ejecución del seed que nuló
 * coverUrl/coverAlt por accidente.
 *
 * Uso:
 *   pnpm db:recover-news-covers
 *   pnpm db:recover-news-covers -- --dry-run   # solo lista sin tocar DB
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const supabase = createSupabaseServiceClient();
  const { data: files, error } = await supabase.storage
    .from("news")
    .list("", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    console.error("✘ No se pudo listar el bucket 'news':", error.message);
    process.exit(1);
  }
  if (!files || files.length === 0) {
    console.error("⚠ El bucket 'news' está vacío. No hay nada que recuperar.");
    process.exit(1);
  }

  // Agrupar archivos por slug (todo lo que precede al primer guion seguido
  // de dígito). Si hay varias subidas para el mismo slug nos quedamos con
  // la más reciente (created_at desc, así que la primera del grupo).
  const byPrefix = new Map<string, { name: string; createdAt: string }>();
  for (const f of files) {
    if (!f.name || f.name.endsWith("/")) continue;
    // Extraer slug: nombre menos `-<timestamp>.<ext>`
    const match = f.name.match(/^(.+)-\d{10,}\.(jpg|jpeg|png|webp)$/i);
    if (!match) {
      console.warn(`  ? Skipping (formato inesperado): ${f.name}`);
      continue;
    }
    const slug = match[1];
    if (!byPrefix.has(slug)) {
      byPrefix.set(slug, { name: f.name, createdAt: f.created_at ?? "" });
    }
  }

  if (byPrefix.size === 0) {
    console.error("⚠ Sin archivos con formato conocido en el bucket.");
    process.exit(1);
  }

  console.log(`Encontrados ${byPrefix.size} slugs con imagen en el bucket.\n`);

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const [slug, file] of byPrefix.entries()) {
    const [article] = await db
      .select({ id: newsArticles.id, currentCover: newsArticles.coverUrl })
      .from(newsArticles)
      .where(eq(newsArticles.slug, slug))
      .limit(1);

    if (!article) {
      console.warn(`  ? Sin artículo para slug ${slug} (¿borrado?)`);
      missing++;
      continue;
    }

    if (article.currentCover) {
      console.log(`  = ${slug} ya tiene coverUrl (ok), salto.`);
      skipped++;
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("news").getPublicUrl(file.name);

    if (dryRun) {
      console.log(`  ✎ [DRY] ${slug} ← ${file.name}`);
      updated++;
      continue;
    }

    await db
      .update(newsArticles)
      .set({ coverUrl: publicUrl })
      .where(eq(newsArticles.id, article.id));

    console.log(`  ✔ ${slug} ← ${file.name}`);
    updated++;
  }

  console.log(
    `\n${dryRun ? "[DRY RUN] " : ""}Actualizados: ${updated} · Ya tenían cover: ${skipped} · Slug sin artículo: ${missing}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
