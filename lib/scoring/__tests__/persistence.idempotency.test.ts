/**
 * Test de integración: el recompute del scoring de un partido es IDEMPOTENTE
 * (correrlo dos veces deja el `points_ledger` byte a byte igual — ni doble
 * conteo ni entradas huérfanas). Es la garantía que protege "los puntos se
 * computan como deberían" frente a regresiones en `replaceLedgerEntries`.
 *
 * Necesita una BD desechable: solo corre si `TEST_DATABASE_URL` está definido
 * (en CI se levanta un Postgres efímero y se aplica el esquema con
 * `drizzle-kit push`). En local, sin esa variable, el test se SALTA — y al
 * importar el módulo de BD de forma diferida dentro de `beforeAll`, nunca llega
 * a conectar a nada.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
// schema.ts solo define tablas (sin efectos de BD), así que es seguro
// importarlo de forma normal. El cliente real (`@/lib/db`) y persistence —que
// sí leen DATABASE_URL al importarse— se cargan de forma diferida en beforeAll.
import {
  leagues,
  matches,
  pointsLedger,
  predMatchResult,
  profiles,
  teams,
} from "@/lib/db/schema";
import type { Database } from "@/lib/db";
import type { recomputeMatchScoringForAllUsers } from "@/lib/scoring/persistence";

const RUN = !!process.env.TEST_DATABASE_URL;

// Apuntamos la conexión a la BD de test ANTES de que se importe `@/lib/db`
// (que lee DATABASE_URL en tiempo de import). Solo si hay TEST_DATABASE_URL.
if (RUN) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DATABASE_DIRECT_URL = process.env.TEST_DATABASE_URL;
}

describe.skipIf(!RUN)("persistence · idempotencia del scoring de partido", () => {
  let db: Database;
  let recompute: typeof recomputeMatchScoringForAllUsers;

  const userId = randomUUID();
  const tag = userId.slice(0, 8);
  let leagueId: number;
  let matchId: number;

  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ recomputeMatchScoringForAllUsers: recompute } = await import(
      "@/lib/scoring/persistence"
    ));

    const [home] = await db
      .insert(teams)
      .values({ code: `TA${tag}`, name: "Test A" })
      .returning();
    const [away] = await db
      .insert(teams)
      .values({ code: `TB${tag}`, name: "Test B" })
      .returning();
    const [league] = await db
      .insert(leagues)
      .values({ slug: `idem-${tag}`, name: "Idem", inviteToken: `tok-${tag}` })
      .returning();
    leagueId = league.id;
    await db
      .insert(profiles)
      .values({ id: userId, email: `idem-${tag}@test.local`, leagueId });
    const [match] = await db
      .insert(matches)
      .values({
        code: `IDEM-${tag}`,
        stage: "group",
        scheduledAt: new Date("2026-06-11T18:00:00Z"),
        status: "finished",
        homeScore: 2,
        awayScore: 1,
        homeTeamId: home.id,
        awayTeamId: away.id,
      })
      .returning();
    matchId = match.id;
    // Predicción de marcador EXACTO → garantiza que el recompute genera
    // entradas en el ledger (acierto exacto + resultado).
    await db
      .insert(predMatchResult)
      .values({ userId, leagueId, matchId, homeScore: 2, awayScore: 1 });
  });

  afterAll(async () => {
    if (!RUN || !db) return;
    try {
      await db.delete(pointsLedger).where(eq(pointsLedger.userId, userId));
      await db.delete(predMatchResult).where(eq(predMatchResult.userId, userId));
      await db.delete(matches).where(eq(matches.id, matchId));
      await db.delete(profiles).where(eq(profiles.id, userId));
      await db.delete(leagues).where(eq(leagues.id, leagueId));
    } catch {
      // BD desechable en CI; limpieza best-effort.
    }
    await globalThis.__pg?.end({ timeout: 5 });
  });

  async function ledgerSnapshot() {
    const rows = await db
      .select({
        source: pointsLedger.source,
        sourceKey: pointsLedger.sourceKey,
        points: pointsLedger.points,
      })
      .from(pointsLedger)
      .where(and(eq(pointsLedger.userId, userId), eq(pointsLedger.leagueId, leagueId)));
    return rows.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  }

  it("recompute x2 deja el ledger idéntico (sin doblar ni huérfanos)", async () => {
    await recompute(matchId);
    const first = await ledgerSnapshot();
    expect(first.length).toBeGreaterThan(0); // el acierto exacto puntúa

    await recompute(matchId);
    const second = await ledgerSnapshot();

    expect(second).toEqual(first);
  });
});
