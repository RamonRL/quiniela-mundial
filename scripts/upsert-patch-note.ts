import { readFile } from "node:fs/promises";
import { z } from "zod";
import { db } from "@/lib/db";
import { patchNotes } from "@/lib/db/schema";

/**
 * Inserta una entrada en el tablón de notas (patch_notes).
 *
 * Pensado para dispararse desde el slash command
 * `/notificar-cambio <rama>`: Claude analiza la rama, redacta una nota
 * orientada al usuario final (no al desarrollador) y la persiste con
 * este script.
 *
 * Formato del JSON:
 *   {
 *     "type": "feature" | "improvement" | "fix" | "note",
 *     "title": "máx 120 chars",
 *     "body": "máx 2000 chars, una o más líneas",
 *     "publish": true | false  // si false → borrador, no aparece en
 *                                  el dashboard hasta que un admin lo
 *                                  publique desde /admin/notas
 *   }
 *
 * Uso:
 *   pnpm db:upsert-patch-note /tmp/note.json
 *   pnpm db:upsert-patch-note /tmp/note.json --dry-run
 */

const schema = z.object({
  type: z.enum(["feature", "improvement", "fix", "note"]),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1).max(2000),
  publish: z.boolean().default(true),
});

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const pathArg = args.find((a) => !a.startsWith("--"));
  if (!pathArg) {
    console.error("Uso: pnpm db:upsert-patch-note <ruta.json> [--dry-run]");
    process.exit(1);
  }

  const raw = await readFile(pathArg, "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("JSON inválido:", parsed.error.issues);
    process.exit(1);
  }
  const note = parsed.data;

  console.log(`→ ${dryRun ? "[DRY-RUN] " : ""}Nueva nota:`);
  console.log(`  tipo:      ${note.type}`);
  console.log(`  título:    ${note.title}`);
  console.log(`  cuerpo:    ${note.body.length} chars`);
  console.log(`  publicar:  ${note.publish ? "sí (visible en dashboard)" : "no (borrador)"}`);

  if (dryRun) {
    console.log("\n✔ Dry-run completo. Nada escrito en DB.");
    return;
  }

  const [created] = await db
    .insert(patchNotes)
    .values({
      type: note.type,
      title: note.title,
      body: note.body,
      publishedAt: note.publish ? new Date() : null,
    })
    .returning({ id: patchNotes.id });

  console.log(`\n✔ Nota creada con id ${created.id}.`);
  console.log("  Editar / despublicar desde /admin/notas.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
