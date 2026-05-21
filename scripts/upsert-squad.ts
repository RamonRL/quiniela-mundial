import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";

/**
 * Inserta o actualiza la plantilla de una selección desde un JSON.
 * Pensado para usarse desde el slash command `/convocatoria` —
 * Claude busca la lista oficial, genera el archivo y dispara este
 * script. También sirve para uso manual.
 *
 * UPSERT por (teamId, name): si el jugador existe (match por nombre
 * normalizado, case-insensitive), se actualizan position y
 * jerseyNumber. Si no existe, se inserta.
 *
 * Formato del JSON:
 *   {
 *     "code": "TUR",
 *     "players": [
 *       { "name": "Hakan Çalhanoğlu", "position": "MED", "jerseyNumber": 10 },
 *       ...
 *     ]
 *   }
 *
 * Uso:
 *   pnpm db:upsert-squad path/to/squad.json
 *   pnpm db:upsert-squad path/to/squad.json --dry-run
 */

const POSITIONS = ["POR", "DEF", "MED", "DEL"] as const;

const SquadSchema = z.object({
  code: z.string().min(2).max(4),
  players: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        position: z.enum(POSITIONS),
        jerseyNumber: z.number().int().min(1).max(99).nullable().optional(),
      }),
    )
    .min(1)
    .max(40),
});

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath) {
    console.error("Uso: tsx scripts/upsert-squad.ts <ruta-al-json> [--dry-run]");
    process.exit(1);
  }

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err) {
    console.error(`✗ No se pudo leer el archivo: ${filePath}`);
    console.error(err);
    process.exit(1);
  }

  let parsed: z.infer<typeof SquadSchema>;
  try {
    parsed = SquadSchema.parse(JSON.parse(raw));
  } catch (err) {
    console.error("✗ JSON inválido:", err);
    process.exit(1);
  }

  const code = parsed.code.toUpperCase();
  const [team] = await db
    .select({ id: teams.id, code: teams.code, name: teams.name })
    .from(teams)
    .where(eq(teams.code, code))
    .limit(1);
  if (!team) {
    console.error(`✗ Equipo ${code} no encontrado en teams.`);
    process.exit(1);
  }

  const existing = await db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      jerseyNumber: players.jerseyNumber,
    })
    .from(players)
    .where(eq(players.teamId, team.id));
  const byNormName = new Map(existing.map((p) => [normalize(p.name), p]));

  console.log(
    `→ ${team.code} ${team.name} · ${existing.length} jugador(es) en DB · ${parsed.players.length} en JSON ${dryRun ? "(DRY-RUN)" : ""}`,
  );

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  for (const p of parsed.players) {
    const key = normalize(p.name);
    const match = byNormName.get(key);
    const jersey = p.jerseyNumber ?? null;
    if (match) {
      const positionChanged = match.position !== p.position;
      const jerseyChanged = match.jerseyNumber !== jersey;
      if (!positionChanged && !jerseyChanged) {
        console.log(`  = ${p.name} (sin cambios)`);
        unchanged++;
        continue;
      }
      const changes: string[] = [];
      if (positionChanged) changes.push(`pos ${match.position} → ${p.position}`);
      if (jerseyChanged) changes.push(`#${match.jerseyNumber ?? "—"} → #${jersey ?? "—"}`);
      console.log(`  ↻ ${p.name} (${changes.join(", ")})`);
      if (!dryRun) {
        await db
          .update(players)
          .set({ position: p.position, jerseyNumber: jersey })
          .where(eq(players.id, match.id));
      }
      updated++;
    } else {
      console.log(
        `  + ${jersey != null ? `#${jersey.toString().padStart(2, "0")} ` : ""}${p.position} ${p.name}`,
      );
      if (!dryRun) {
        await db.insert(players).values({
          teamId: team.id,
          name: p.name,
          position: p.position,
          jerseyNumber: jersey,
        });
      }
      inserted++;
    }
  }

  // Reporte: jugadores en DB que NO están en la nueva lista. No los
  // borramos automáticamente (sería destructivo) — los listamos para
  // que tú decidas.
  const newNorms = new Set(parsed.players.map((p) => normalize(p.name)));
  const orphan = existing.filter((p) => !newNorms.has(normalize(p.name)));
  if (orphan.length > 0) {
    console.log(`\n  ⚠ ${orphan.length} jugador(es) en DB que no están en la nueva lista:`);
    for (const p of orphan) {
      console.log(`      · ${p.name} (id ${p.id})`);
    }
    console.log(
      `    Si quieres borrarlos, hazlo a mano desde /admin/jugadores.`,
    );
  }

  console.log(
    `\n✔ Hecho. Insertados: ${inserted}, actualizados: ${updated}, sin cambios: ${unchanged}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
