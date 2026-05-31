/**
 * Migración puntual del split de la quiniela pública en 3 modos.
 *
 * Regla acordada: los usuarios que YA han hecho al menos 1 predicción en la
 * pública (modo completo) conservan su membresía. Los que están inscritos
 * pero nunca predijeron se quitan — si quieren entrar, tendrán que hacerlo
 * explícitamente. Las nuevas públicas (Marcador / Ganador) arrancan vacías,
 * así que aquí solo tocamos la de modo completo (slug `liga-principal`).
 *
 * Para cada usuario que se quita: si su `profiles.leagueId` apuntaba a la
 * pública, lo reasignamos a otra membresía suya (preferimos una privada) o a
 * NULL (→ el layout lo manda a /onboarding a elegir).
 *
 * Uso:
 *   pnpm db:migrate-public-membership --dry-run
 *   pnpm db:migrate-public-membership
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagueMemberships,
  leagues,
  predBracketSlot,
  predGroupRanking,
  predMatchResult,
  predMatchScorer,
  predSpecial,
  predTournamentTopScorer,
  profiles,
} from "@/lib/db/schema";

const PUBLIC_COMPLETO_SLUG = "liga-principal";

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
  console.log(`→ Liga pública completo: "${pub.name}" (id ${pub.id})${dryRun ? " · DRY-RUN" : ""}`);

  // Usuarios con ≥1 predicción en la pública (cualquiera de las 6 tablas).
  const predictorSets = await Promise.all([
    db.selectDistinct({ userId: predGroupRanking.userId }).from(predGroupRanking).where(eq(predGroupRanking.leagueId, pub.id)),
    db.selectDistinct({ userId: predBracketSlot.userId }).from(predBracketSlot).where(eq(predBracketSlot.leagueId, pub.id)),
    db.selectDistinct({ userId: predTournamentTopScorer.userId }).from(predTournamentTopScorer).where(eq(predTournamentTopScorer.leagueId, pub.id)),
    db.selectDistinct({ userId: predMatchResult.userId }).from(predMatchResult).where(eq(predMatchResult.leagueId, pub.id)),
    db.selectDistinct({ userId: predMatchScorer.userId }).from(predMatchScorer).where(eq(predMatchScorer.leagueId, pub.id)),
    db.selectDistinct({ userId: predSpecial.userId }).from(predSpecial).where(eq(predSpecial.leagueId, pub.id)),
  ]);
  const predictors = new Set<string>();
  for (const rows of predictorSets) for (const r of rows) predictors.add(r.userId);

  // Miembros actuales de la pública.
  const members = await db
    .select({ userId: leagueMemberships.userId })
    .from(leagueMemberships)
    .where(eq(leagueMemberships.leagueId, pub.id));

  const toRemove = members.map((m) => m.userId).filter((id) => !predictors.has(id));
  const kept = members.length - toRemove.length;

  console.log(`  ${members.length} miembros · ${kept} conservan (predijeron) · ${toRemove.length} a quitar`);

  if (toRemove.length === 0) {
    console.log("✔ Nada que quitar.");
    return;
  }

  // De los que se quitan, cuáles tienen la pública como liga activa.
  const activeOnPublic = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(inArray(profiles.id, toRemove), eq(profiles.leagueId, pub.id)));
  console.log(`  de esos, ${activeOnPublic.length} la tienen como liga activa → se reasignan`);

  if (dryRun) {
    console.log("\n✔ Dry-run. Nada escrito. Re-ejecuta sin --dry-run para aplicar.");
    return;
  }

  // 1) Reasignar liga activa de los que salen y la tenían apuntada a la pública.
  for (const p of activeOnPublic) {
    // Otra membresía suya — preferimos privada (isPublic=false), si no, NULL.
    const [fallback] = await db
      .select({ leagueId: leagueMemberships.leagueId })
      .from(leagueMemberships)
      .innerJoin(leagues, eq(leagues.id, leagueMemberships.leagueId))
      .where(and(eq(leagueMemberships.userId, p.id), eq(leagues.isPublic, false)))
      .limit(1);
    await db
      .update(profiles)
      .set({ leagueId: fallback?.leagueId ?? null })
      .where(eq(profiles.id, p.id));
  }

  // 2) Quitar las membresías.
  await db
    .delete(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.leagueId, pub.id),
        inArray(leagueMemberships.userId, toRemove),
      ),
    );

  console.log(`\n✔ Hecho. ${toRemove.length} membresías quitadas, ${activeOnPublic.length} ligas activas reasignadas.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
