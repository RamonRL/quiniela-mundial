import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";

/**
 * Inserta la pre-convocatoria de 30 jugadores de Irán para el Mundial
 * 2026 (Ghalenoei, anuncio del 17 de mayo de 2026).
 *
 * Fuentes:
 *   - olympics.com (lista oficial con posiciones)
 *   - PersianFootball + FIFA + Al Jazeera (corroboran)
 *
 * Dorsales asignados de forma secuencial agrupada por posición
 * (1-4 porteros, 5-13 defensas, 14-23 medios, 24-30 delanteros).
 * El user ajustará los que considere desde /admin.
 *
 * Idempotente: si un nombre ya existe para el equipo, lo salta.
 *
 * Uso:
 *   pnpm db:seed-iran-squad
 */

type SeedPlayer = {
  name: string;
  position: "POR" | "DEF" | "MED" | "DEL";
  jerseyNumber: number;
};

const SQUAD: SeedPlayer[] = [
  // Porteros (4)
  { name: "Alireza Beiranvand", position: "POR", jerseyNumber: 1 },
  { name: "Payam Niazmand", position: "POR", jerseyNumber: 2 },
  { name: "Seyed Hossein Hosseini", position: "POR", jerseyNumber: 3 },
  { name: "Mohammad Khalifeh", position: "POR", jerseyNumber: 4 },
  // Defensas (9)
  { name: "Ramin Rezaeian", position: "DEF", jerseyNumber: 5 },
  { name: "Ehsan Hajsafi", position: "DEF", jerseyNumber: 6 },
  { name: "Milad Mohammadi", position: "DEF", jerseyNumber: 7 },
  { name: "Shoja Khalilzadeh", position: "DEF", jerseyNumber: 8 },
  { name: "Hossein Kanaani", position: "DEF", jerseyNumber: 9 },
  { name: "Omid Noorafkan", position: "DEF", jerseyNumber: 10 },
  { name: "Saleh Hardani", position: "DEF", jerseyNumber: 11 },
  { name: "Ali Nemati", position: "DEF", jerseyNumber: 12 },
  { name: "Danial Eiri", position: "DEF", jerseyNumber: 13 },
  // Medios (10)
  { name: "Alireza Jahanbakhsh", position: "MED", jerseyNumber: 14 },
  { name: "Saman Ghoddos", position: "MED", jerseyNumber: 15 },
  { name: "Saeid Ezatolahi", position: "MED", jerseyNumber: 16 },
  { name: "Rouzbeh Cheshmi", position: "MED", jerseyNumber: 17 },
  { name: "Mehdi Torabi", position: "MED", jerseyNumber: 18 },
  { name: "Mehdi Ghaedi", position: "MED", jerseyNumber: 19 },
  { name: "Mohammad Mohebi", position: "MED", jerseyNumber: 20 },
  { name: "Mohammad Ghorbani", position: "MED", jerseyNumber: 21 },
  { name: "Amir Mohammad Razzaghinia", position: "MED", jerseyNumber: 22 },
  { name: "Aria Yousefi", position: "MED", jerseyNumber: 23 },
  // Delanteros (7)
  { name: "Mehdi Taremi", position: "DEL", jerseyNumber: 24 },
  { name: "Ali Alipour", position: "DEL", jerseyNumber: 25 },
  { name: "Amirhossein Hosseinzadeh", position: "DEL", jerseyNumber: 26 },
  { name: "Hadi Habibinejad", position: "DEL", jerseyNumber: 27 },
  { name: "Amirhossein Mahmoudi", position: "DEL", jerseyNumber: 28 },
  { name: "Kasra Taheri", position: "DEL", jerseyNumber: 29 },
  { name: "Dennis Dargahi", position: "DEL", jerseyNumber: 30 },
];

async function main() {
  const [team] = await db
    .select({ id: teams.id, code: teams.code, name: teams.name })
    .from(teams)
    .where(eq(teams.code, "IRN"))
    .limit(1);
  if (!team) {
    console.error("✘ Equipo IRN no encontrado en la tabla teams.");
    process.exit(1);
  }

  const existing = await db
    .select({ name: players.name })
    .from(players)
    .where(eq(players.teamId, team.id));
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

  console.log(
    `→ ${team.code} ${team.name} · ${existing.length} jugador(es) ya en DB.`,
  );

  let inserted = 0;
  let skipped = 0;
  for (const p of SQUAD) {
    if (existingNames.has(p.name.toLowerCase())) {
      console.log(`  ↷ ya existe, skip: ${p.name}`);
      skipped++;
      continue;
    }
    await db.insert(players).values({
      teamId: team.id,
      name: p.name,
      position: p.position,
      jerseyNumber: p.jerseyNumber,
    });
    console.log(`  + ${p.jerseyNumber.toString().padStart(2, "0")} ${p.position} ${p.name}`);
    inserted++;
  }

  console.log(`\n✔ Hecho. Insertados: ${inserted}, ya existían: ${skipped}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
