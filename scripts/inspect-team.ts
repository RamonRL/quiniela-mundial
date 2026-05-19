import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";

/**
 * Inspecciona el roster de UNA selección por código FIFA. Útil cuando
 * vamos a redactar la noticia de su convocatoria y queremos cruzar la
 * lista mediática con lo que tu app tiene cargado.
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/inspect-team.ts KOR
 */
async function main() {
  const code = process.argv[2]?.toUpperCase();
  if (!code) {
    console.error("Uso: tsx scripts/inspect-team.ts <CODE>");
    process.exit(1);
  }
  const [team] = await db.select().from(teams).where(eq(teams.code, code)).limit(1);
  if (!team) {
    console.log(`✘ ${code} no está en teams.`);
    return;
  }
  const squad = await db
    .select({
      name: players.name,
      position: players.position,
      jersey: players.jerseyNumber,
      hasPhoto: sql<boolean>`${players.photoUrl} is not null`,
    })
    .from(players)
    .where(eq(players.teamId, team.id))
    .orderBy(asc(players.jerseyNumber));

  const withPhoto = squad.filter((p) => p.hasPhoto).length;
  console.log(`\n=== ${code} · ${team.name} — ${squad.length} jugadores (${withPhoto} con foto) ===`);
  for (const p of squad) {
    const j = p.jersey?.toString().padStart(2, " ") ?? "  ";
    console.log(`  ${j}  ${(p.position ?? "?").padEnd(3)}  ${p.name}${p.hasPhoto ? "" : "  · sin foto"}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
