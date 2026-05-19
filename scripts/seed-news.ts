import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles, teams } from "@/lib/db/schema";
import { SEED_NEWS } from "@/lib/news/seed-data";

/**
 * Siembra el lote de noticias editoriales en `news_articles`.
 *
 * Comportamiento:
 * - INSERT si el slug no existe. coverUrl/coverAlt quedan en null
 *   para que el admin suba la imagen después.
 * - UPDATE si ya existe. **NO toca coverUrl ni coverAlt** — esas son
 *   editables vía admin y se respetan. Tampoco toca authorId ni el
 *   publishedAt original. Solo refresca el contenido editorial:
 *   título, excerpt, body, categoría, tags, equipos relacionados.
 *   Esto significa que re-correr el seed es seguro tras editar
 *   imagen, autor o fecha de publicación desde /admin/noticias.
 *
 * Los `relatedTeamCodes` se filtran contra la tabla `teams` real —
 * los códigos desconocidos se descartan sin romper.
 *
 * Uso:
 *   pnpm db:seed-news
 */
async function main() {
  console.log(`→ Sembrando ${SEED_NEWS.length} artículos de noticias…`);

  const allTeams = await db.select({ code: teams.code }).from(teams);
  const knownCodes = new Set(allTeams.map((t) => t.code));

  const now = new Date();

  for (const seed of SEED_NEWS) {
    const filteredTeamCodes = seed.relatedTeamCodes.filter((c) =>
      knownCodes.has(c),
    );

    const existing = await db
      .select({ id: newsArticles.id })
      .from(newsArticles)
      .where(eq(newsArticles.slug, seed.slug))
      .limit(1);

    if (existing[0]) {
      // UPDATE editorial-only: respeta lo que el admin haya editado
      // desde /admin/noticias (cover, autor, publishedAt).
      await db
        .update(newsArticles)
        .set({
          title: seed.title,
          seoTitle: seed.seoTitle ?? null,
          excerpt: seed.excerpt,
          body: seed.body,
          category: seed.category,
          tags: seed.tags,
          relatedTeamCodes: filteredTeamCodes,
          updatedAt: now,
        })
        .where(eq(newsArticles.id, existing[0].id));
      console.log(`  ↻ Actualizado: ${seed.slug}`);
    } else {
      const publishedAt = new Date(
        now.getTime() - seed.daysAgo * 24 * 60 * 60 * 1000,
      );
      await db.insert(newsArticles).values({
        slug: seed.slug,
        title: seed.title,
        seoTitle: seed.seoTitle ?? null,
        excerpt: seed.excerpt,
        body: seed.body,
        coverUrl: null,
        coverAlt: null,
        category: seed.category,
        tags: seed.tags,
        relatedTeamCodes: filteredTeamCodes,
        relatedMatchId: null,
        authorId: null,
        status: "published" as const,
        publishedAt,
        updatedAt: now,
      });
      console.log(`  + Creado:     ${seed.slug}`);
    }
  }

  console.log("✔ Seed de noticias completado.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
