import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groups,
  matches,
  players,
  pointsLedger,
  specialPredictions,
  teams,
} from "@/lib/db/schema";
import { ledgerCategory, ledgerLabelKey, type LedgerCategory } from "@/lib/scoring/ledger-labels";

export type ActivityEntry = {
  id: number;
  points: number;
  computedAt: string;
  label: string;
  detail: string | null;
  /** Categoría padre (para color + icono en la UI). */
  category: LedgerCategory | null;
};

/** Traductor del namespace `ledger` (next-intl); admite params. */
type LedgerTranslator = (key: string) => string;

/**
 * Recent points the user has earned. We hydrate references from sourceRef
 * so each entry can show a human-readable detail (e.g. "MEX vs RSA",
 * "Lamine Yamal"). `t` traduce la etiqueta de cada categoría (namespace
 * `ledger`); si no se pasa, se cae a la clave/clave-raw.
 */
export async function loadActivityFeed(
  userId: string,
  leagueId: number,
  limit = 8,
  t?: LedgerTranslator,
): Promise<ActivityEntry[]> {
  const rows = await db
    .select()
    .from(pointsLedger)
    .where(
      and(eq(pointsLedger.userId, userId), eq(pointsLedger.leagueId, leagueId)),
    )
    .orderBy(desc(pointsLedger.computedAt), desc(pointsLedger.id))
    .limit(limit);
  if (rows.length === 0) return [];

  // Collect referenced ids per type.
  const matchIds = new Set<number>();
  const teamIds = new Set<number>();
  const playerIds = new Set<number>();
  const groupIds = new Set<number>();
  const specialIds = new Set<number>();

  for (const r of rows) {
    const ref = (r.sourceRef ?? {}) as Record<string, unknown>;
    if (typeof ref.matchId === "number") matchIds.add(ref.matchId);
    if (typeof ref.teamId === "number") teamIds.add(ref.teamId);
    if (typeof ref.playerId === "number") playerIds.add(ref.playerId);
    if (typeof ref.predictedPlayerId === "number") playerIds.add(ref.predictedPlayerId);
    if (typeof ref.groupId === "number") groupIds.add(ref.groupId);
    if (typeof ref.specialId === "number") specialIds.add(ref.specialId);
  }

  // Los partidos primero: necesitamos sus equipos local/visitante para el
  // detalle "MEX vs RSA" (antes solo se cargaban los equipos de `ref.teamId`,
  // de ahí el "? vs ?").
  const matchRows =
    matchIds.size > 0
      ? await db.select().from(matches).where(inArray(matches.id, [...matchIds]))
      : [];
  for (const m of matchRows) {
    if (m.homeTeamId != null) teamIds.add(m.homeTeamId);
    if (m.awayTeamId != null) teamIds.add(m.awayTeamId);
  }

  const [teamRows, playerRows, groupRows, specialRows] = await Promise.all([
    teamIds.size > 0
      ? db.select().from(teams).where(inArray(teams.id, [...teamIds]))
      : Promise.resolve([]),
    playerIds.size > 0
      ? db.select().from(players).where(inArray(players.id, [...playerIds]))
      : Promise.resolve([]),
    groupIds.size > 0
      ? db.select().from(groups).where(inArray(groups.id, [...groupIds]))
      : Promise.resolve([]),
    specialIds.size > 0
      ? db
          .select()
          .from(specialPredictions)
          .where(inArray(specialPredictions.id, [...specialIds]))
      : Promise.resolve([]),
  ]);

  const matchById = new Map(matchRows.map((m) => [m.id, m]));
  const teamById = new Map(teamRows.map((t) => [t.id, t]));
  const playerById = new Map(playerRows.map((p) => [p.id, p]));
  const groupById = new Map(groupRows.map((g) => [g.id, g]));
  const specialById = new Map(specialRows.map((s) => [s.id, s]));

  return rows.map((r) => {
    const ref = (r.sourceRef ?? {}) as Record<string, unknown>;
    const key = ledgerLabelKey(r.source, ref, r.points);
    const label = key && t ? t(key) : key ?? r.source;
    let detail: string | null = null;

    if (typeof ref.matchId === "number") {
      const m = matchById.get(ref.matchId);
      if (m) {
        const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
        const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
        detail = `${home?.code ?? "?"} vs ${away?.code ?? "?"}`;
      }
    }
    if (typeof ref.playerId === "number") {
      const p = playerById.get(ref.playerId);
      if (p) detail = detail ? `${detail} · ${p.name}` : p.name;
    }
    if (typeof ref.predictedPlayerId === "number" && !detail) {
      const p = playerById.get(ref.predictedPlayerId);
      if (p) detail = p.name;
    }
    if (typeof ref.teamId === "number" && !detail) {
      const t = teamById.get(ref.teamId);
      if (t) detail = t.name;
    }
    if (typeof ref.groupId === "number" && !detail) {
      const g = groupById.get(ref.groupId);
      if (g) detail = g.name;
    }
    if (typeof ref.specialId === "number" && !detail) {
      const sp = specialById.get(ref.specialId);
      if (sp) detail = sp.question;
    }

    return {
      id: r.id,
      points: r.points,
      computedAt: r.computedAt.toISOString(),
      label,
      detail,
      category: ledgerCategory(r.source),
    };
  });
}
