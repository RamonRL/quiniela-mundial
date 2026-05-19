import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles, teams } from "@/lib/db/schema";
import { SEED_NEWS } from "@/lib/news/seed-data";

/**
 * Siembra el lote inicial de noticias en `news_articles`. Es idempotente:
 * si el slug ya existe, hace UPDATE; si no, INSERT. Eso permite re-correr
 * el script sin duplicar registros y, al mismo tiempo, refrescar el cuerpo
 * de un artículo si has cambiado el seed-data.
 *
 * Los `relatedTeamCodes` se filtran contra la tabla `teams` real — los
 * códigos desconocidos se descartan sin romper para no acoplar el seed
 * al estado exacto de la DB.
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
    const publishedAt = new Date(now.getTime() - seed.daysAgo * 24 * 60 * 60 * 1000);
    const filteredTeamCodes = seed.relatedTeamCodes.filter((c) =>
      knownCodes.has(c),
    );

    const values = {
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
    };

    const existing = await db
      .select({ id: newsArticles.id })
      .from(newsArticles)
      .where(eq(newsArticles.slug, seed.slug))
      .limit(1);

    if (existing[0]) {
      await db
        .update(newsArticles)
        .set(values)
        .where(eq(newsArticles.id, existing[0].id));
      console.log(`  ↻ Actualizado: ${seed.slug}`);
    } else {
      await db.insert(newsArticles).values(values);
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
