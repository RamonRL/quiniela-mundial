import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predBracketSlot, teams } from "@/lib/db/schema";
import { getQualifiedTeamIds } from "@/lib/bracket-state";
import { localizeTeams } from "@/lib/team-names";

/**
 * Helpers compartidos para pintar un bracket (emparejamientos R32 + picks de un
 * usuario). Los usa la página de bracket propia y la comparación de brackets en
 * /comparar. Las picks van filtradas al pool de clasificados (set-membership,
 * igual que el scorer).
 */
export type BracketPicks = {
  r16: number[];
  qf: number[];
  sf: number[];
  finalists: number[];
  championTeamId: number | null;
  thirdTeamId: number | null;
};

export type BracketBoard = {
  qualifiedTeams: Array<{ id: number; code: string; name: string; flagUrl: string | null }>;
  r32Pairings: Record<string, { homeId: number | null; awayId: number | null }>;
  poolSet: Set<number>;
};

/** Equipos clasificados + emparejamientos reales de R32. */
export async function loadBracketBoard(locale: string): Promise<BracketBoard> {
  const qualifiedIds = await getQualifiedTeamIds();
  const raw =
    qualifiedIds.length > 0
      ? await db.select().from(teams).where(inArray(teams.id, qualifiedIds))
      : [];
  const qualifiedTeams = localizeTeams(raw, locale);
  const r32 = await db
    .select({ code: matches.code, home: matches.homeTeamId, away: matches.awayTeamId })
    .from(matches)
    .where(eq(matches.stage, "r32"));
  const r32Pairings: Record<string, { homeId: number | null; awayId: number | null }> = {};
  for (const m of r32) r32Pairings[m.code] = { homeId: m.home ?? null, awayId: m.away ?? null };
  return { qualifiedTeams, r32Pairings, poolSet: new Set(qualifiedTeams.map((t) => t.id)) };
}

/** Picks de bracket de un usuario en una liga (filtradas al pool de clasificados). */
export async function loadUserBracketPicks(
  userId: string,
  leagueId: number,
  poolSet: Set<number>,
): Promise<BracketPicks> {
  const rows = await db
    .select()
    .from(predBracketSlot)
    .where(and(eq(predBracketSlot.userId, userId), eq(predBracketSlot.leagueId, leagueId)));
  const inPool = (id: number | null | undefined): id is number => id != null && poolSet.has(id);
  return {
    r16: rows.filter((m) => m.stage === "r16").map((m) => m.predictedTeamId).filter(inPool),
    qf: rows.filter((m) => m.stage === "qf").map((m) => m.predictedTeamId).filter(inPool),
    sf: rows.filter((m) => m.stage === "sf").map((m) => m.predictedTeamId).filter(inPool),
    finalists: rows
      .filter((m) => m.stage === "final" && m.slotPosition !== 0)
      .map((m) => m.predictedTeamId)
      .filter(inPool),
    championTeamId: inPool(rows.find((m) => m.stage === "final" && m.slotPosition === 0)?.predictedTeamId)
      ? (rows.find((m) => m.stage === "final" && m.slotPosition === 0)!.predictedTeamId as number)
      : null,
    thirdTeamId: inPool(rows.find((m) => m.stage === "third" && m.slotPosition === 0)?.predictedTeamId)
      ? (rows.find((m) => m.stage === "third" && m.slotPosition === 0)!.predictedTeamId as number)
      : null,
  };
}
