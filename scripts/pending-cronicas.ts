/**
 * Dispatcher de crónicas automáticas.
 *
 * Imprime (uno por línea, en stdout) los CÓDIGOS de partido que cumplen
 * TODAS estas condiciones y por tanto necesitan una crónica:
 *
 *   1. `status = 'finished'` — el resultado oficial ya está en la BD.
 *   2. `scheduledAt <= now() - DELAY` — han pasado ~2 h desde el pitido
 *      final (kickoff + ~2 h de partido + 2 h de margen ⇒ 4 h por
 *      defecto), tiempo suficiente para que existan crónicas web de
 *      donde sacar color y contexto.
 *   3. No existe ya un artículo `category='cronica'` con
 *      `relatedMatchId = match.id` — idempotente: nunca regenera una
 *      crónica ya publicada.
 *
 * El runner local (`scripts/auto-cronica.sh`, lanzado por cron) lee esta
 * salida y, por cada código, invoca `claude -p "/cronica-qm <code>"` en
 * modo headless.
 *
 * Uso:
 *   pnpm db:pending-cronicas            # lista los códigos pendientes
 *   CRONICA_DELAY_HOURS=3 pnpm db:pending-cronicas
 *
 * Salida: cero o más líneas, cada una un código (p. ej. `M02`). Sin
 * pendientes ⇒ salida vacía (exit 0).
 */
import { db } from "@/lib/db";
import { matches, newsArticles } from "@/lib/db/schema";
import { and, asc, eq, lte, notExists, sql } from "drizzle-orm";

const DELAY_HOURS = Number(process.env.CRONICA_DELAY_HOURS ?? "4");

async function main() {
  const cutoff = new Date(Date.now() - DELAY_HOURS * 60 * 60 * 1000);

  const pending = await db
    .select({ code: matches.code })
    .from(matches)
    .where(
      and(
        eq(matches.status, "finished"),
        lte(matches.scheduledAt, cutoff),
        notExists(
          db
            .select({ one: sql`1` })
            .from(newsArticles)
            .where(
              and(
                eq(newsArticles.relatedMatchId, matches.id),
                eq(newsArticles.category, "cronica"),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(matches.scheduledAt));

  for (const row of pending) {
    if (row.code) console.log(row.code);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.message : e);
  process.exit(1);
});
