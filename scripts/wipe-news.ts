import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles } from "@/lib/db/schema";

/**
 * Borra noticias de la tabla `news_articles`. Por defecto borra
 * únicamente las de categoría `convocatoria` — útil para limpiar
 * artículos inventados sin tocar el resto.
 *
 * Uso:
 *   pnpm db:wipe-news                       # borra solo convocatorias
 *   pnpm db:wipe-news -- --all --yes        # borra TODO el contenido de noticias
 *   pnpm db:wipe-news -- --slugs=a,b        # borra los slugs indicados
 *
 * `--all` exige además `--yes` como red de seguridad: borrar TODAS las
 * noticias de producción no debe poder ocurrir por un autocompletado o un
 * historial de shell despistado.
 */
async function main() {
  const args = process.argv.slice(2);
  const wipeAll = args.includes("--all");
  const confirmed = args.includes("--yes");
  const slugsArg = args.find((a) => a.startsWith("--slugs="));
  const slugs = slugsArg
    ? slugsArg
        .slice("--slugs=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (wipeAll) {
    if (!confirmed) {
      console.error(
        "✋ --all borra TODAS las noticias de producción. Repite con --yes para confirmar:\n" +
          "   pnpm db:wipe-news -- --all --yes",
      );
      process.exit(1);
    }
    const result = await db.delete(newsArticles).returning({ id: newsArticles.id });
    console.log(`✔ Borradas ${result.length} noticias (todas).`);
    return;
  }

  if (slugs.length > 0) {
    const result = await db
      .delete(newsArticles)
      .where(inArray(newsArticles.slug, slugs))
      .returning({ slug: newsArticles.slug });
    console.log(`✔ Borradas ${result.length} noticias por slug:`);
    for (const r of result) console.log(`  - ${r.slug}`);
    return;
  }

  // Default: borrar solo convocatorias.
  const result = await db
    .delete(newsArticles)
    .where(sql`${newsArticles.category} = 'convocatoria'`)
    .returning({ slug: newsArticles.slug });
  console.log(`✔ Borradas ${result.length} convocatorias:`);
  for (const r of result) console.log(`  - ${r.slug}`);
  console.log("\nPara borrar todo: pnpm db:wipe-news -- --all");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
