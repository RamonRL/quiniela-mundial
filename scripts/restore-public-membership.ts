/**
 * Reinscribe en la quiniela pública (modo Completo, slug `liga-principal`) a
 * TODOS los usuarios que se quedaron sin ninguna liga.
 *
 * Contexto: la migración del split de la pública en 3 modos
 * (`migrate-public-membership.ts`) quitó a los miembros de la pública que
 * nunca habían predicho. Algunos se quedaron con 0 ligas y, al entrar, el
 * layout los manda a /onboarding. Este script los devuelve a la pública
 * completo y la deja como su liga activa.
 *
 * Criterio: cualquier `profiles` NO baneado con 0 filas en
 * `league_memberships`. Se inserta la membresía (idempotente) y se fija
 * `profiles.leagueId` a la pública (su `leagueId` anterior, si lo tenía, era
 * inválido porque no era miembro de ninguna liga).
 *
 * Uso:
 *   pnpm db:restore-public-membership --dry-run
 *   pnpm db:restore-public-membership
 */
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueMemberships, leagues, profiles } from "@/lib/db/schema";

const PUBLIC_COMPLETO_SLUG = "liga-principal";
const CHUNK = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [pub] = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(eq(leagues.slug, PUBLIC_COMPLETO_SLUG))
    .limit(1);
  if (!pub) {
    console.error(`✗ No existe la liga pública (slug ${PUBLIC_COMPLETO_SLUG}).`);
    process.exit(1);
  }
  console.log(
    `→ Liga pública completo: "${pub.name}" (id ${pub.id})${dryRun ? " · DRY-RUN" : ""}`,
  );

  // Usuarios NO baneados con 0 membresías.
  const candidates = await db.execute<{ id: string; email: string }>(sql`
    SELECT p.id, p.email
    FROM ${profiles} p
    LEFT JOIN ${leagueMemberships} lm ON lm.user_id = p.id
    WHERE lm.user_id IS NULL
      AND p.banned_at IS NULL
    ORDER BY p.created_at ASC
  `);
  const rows = candidates as unknown as { id: string; email: string }[];

  console.log(`  ${rows.length} usuarios sin ninguna liga (no baneados).`);
  if (rows.length === 0) {
    console.log("✔ Nada que reinscribir.");
    return;
  }

  // Muestra de hasta 15 emails para revisar antes de aplicar.
  const sample = rows.slice(0, 15).map((r) => `    · ${r.email}`);
  console.log(sample.join("\n"));
  if (rows.length > 15) console.log(`    … y ${rows.length - 15} más`);

  if (dryRun) {
    console.log("\n✔ Dry-run. Nada escrito. Re-ejecuta sin --dry-run para aplicar.");
    return;
  }

  const ids = rows.map((r) => r.id);

  // 1) Insertar membresías en la pública (idempotente).
  let inserted = 0;
  for (const batch of chunk(ids, CHUNK)) {
    await db
      .insert(leagueMemberships)
      .values(batch.map((userId) => ({ userId, leagueId: pub.id })))
      .onConflictDoNothing();
    inserted += batch.length;
  }

  // 2) Fijar la pública como liga activa (su leagueId anterior era inválido).
  for (const batch of chunk(ids, CHUNK)) {
    await db
      .update(profiles)
      .set({ leagueId: pub.id })
      .where(inArray(profiles.id, batch));
  }

  console.log(
    `\n✔ Hecho. ${inserted} usuarios reinscritos en "${pub.name}" y con ella como liga activa.`,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
