import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles } from "@/lib/db/schema";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Sube las imágenes locales de `/noticias/*.png` al bucket `news` de
 * Supabase Storage y actualiza el `coverUrl`/`coverAlt` de los
 * artículos correspondientes. Pensado para portadas de convocatorias
 * — el flow normal sigue siendo subir desde /admin/noticias, pero
 * cuando hay varias listas que cubrir el mismo día es más rápido un
 * script.
 *
 * Comportamiento:
 *  - Si el artículo no tiene `coverUrl` aún → lo sube y lo asigna.
 *  - Si ya tiene `coverUrl` → no toca (respeta lo que haya elegido el
 *    admin desde la UI). Usa la flag `--force` para sobreescribir.
 *
 * Uso:
 *   pnpm db:upload-news-covers
 *   pnpm db:upload-news-covers --force
 */

const COVERS: { slug: string; file: string; alt: string }[] = [
  {
    slug: "convocatoria-cabo-verde-mundial-2026-bubista-historia",
    file: "convo_caboverde.png",
    alt: "Cabo Verde · convocatoria para el Mundial 2026",
  },
  {
    slug: "convocatoria-suiza-mundial-2026-yakin-xhaka-post-sommer",
    file: "convo_suiza.png",
    alt: "Suiza · convocatoria de Murat Yakin para el Mundial 2026",
  },
  {
    slug: "convocatoria-alemania-mundial-2026-nagelsmann-neuer-regreso",
    file: "convo_alemania.png",
    alt: "Alemania · convocatoria de Julian Nagelsmann para el Mundial 2026",
  },
];

async function main() {
  const force = process.argv.includes("--force");
  const supabase = createSupabaseServiceClient();
  const noticiasDir = path.join(process.cwd(), "noticias");

  let touched = 0;
  let skipped = 0;
  let missing = 0;

  for (const c of COVERS) {
    const [article] = await db
      .select({ id: newsArticles.id, coverUrl: newsArticles.coverUrl })
      .from(newsArticles)
      .where(eq(newsArticles.slug, c.slug))
      .limit(1);
    if (!article) {
      console.log(`  ⚠ artículo no encontrado: ${c.slug}`);
      missing++;
      continue;
    }
    if (article.coverUrl && !force) {
      console.log(`  ↷ ya tiene cover, skip: ${c.slug}`);
      skipped++;
      continue;
    }

    const filePath = path.join(noticiasDir, c.file);
    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch {
      console.error(`  ✗ imagen no encontrada: ${filePath}`);
      missing++;
      continue;
    }

    const ext = c.file.toLowerCase().endsWith(".png") ? "png" : "jpg";
    // Sigue el formato del upload del admin (`${slug}-${timestamp}.{ext}`)
    // para que `db:recover-news-covers` lo pueda reconciliar en el futuro
    // sin tocar nada.
    const remotePath = `${c.slug}-${Date.now()}.${ext}`;
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    const { error } = await supabase.storage
      .from("news")
      .upload(remotePath, buffer, { contentType, upsert: true });
    if (error) {
      console.error(`  ✗ upload falló (${c.slug}): ${error.message}`);
      continue;
    }
    const { data } = supabase.storage.from("news").getPublicUrl(remotePath);

    await db
      .update(newsArticles)
      .set({
        coverUrl: data.publicUrl,
        coverAlt: c.alt,
        updatedAt: new Date(),
      })
      .where(eq(newsArticles.id, article.id));
    console.log(`  ✓ ${c.slug} → ${remotePath}`);
    touched++;
  }

  console.log(
    `Hecho. Actualizados: ${touched}, ya tenían cover: ${skipped}, no encontrados: ${missing}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
