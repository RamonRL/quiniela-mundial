/**
 * Carga los hechos de un partido desde la BD y los normaliza al shape que
 * consume `renderCronicaCover`. Compartido por el script
 * `scripts/gen-cronica-cover.ts` (selección por `code`) y por el OG route
 * `noticias/[slug]/opengraph-image.tsx` (selección por `matchId`).
 *
 * Devuelve `null` si el partido no existe o no tiene marcador (no se puede
 * pintar una portada de crónica sin resultado).
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, matches, teams } from "@/lib/db/schema";
import type { CronicaCoverData } from "@/lib/og/cronica-cover";

const STAGE_LABEL: Record<string, string> = {
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "Tercer puesto",
  final: "Final",
};

function dateLabel(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  })
    .format(d)
    .replace(/\./g, "")
    .toUpperCase();
}

export async function loadCronicaCoverData(sel: {
  code?: string;
  matchId?: number;
}): Promise<CronicaCoverData | null> {
  const rows =
    sel.matchId != null
      ? await db.select().from(matches).where(eq(matches.id, sel.matchId)).limit(1)
      : sel.code
        ? await db.select().from(matches).where(eq(matches.code, sel.code)).limit(1)
        : [];
  const m = rows[0];
  if (!m || m.homeScore == null || m.awayScore == null) return null;

  const tids = [m.homeTeamId, m.awayTeamId].filter(Boolean) as number[];
  const ts = tids.length
    ? await db.select().from(teams).where(inArray(teams.id, tids))
    : [];
  const tById = new Map(ts.map((t) => [t.id, t]));
  const home = m.homeTeamId ? tById.get(m.homeTeamId) : null;
  const away = m.awayTeamId ? tById.get(m.awayTeamId) : null;

  let stageLabel = STAGE_LABEL[m.stage] ?? m.stage.toUpperCase();
  if (m.stage === "group" && home?.groupId) {
    const [g] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, home.groupId))
      .limit(1);
    if (g?.code) stageLabel = `Grupo ${g.code}`;
  }

  const winner: CronicaCoverData["winner"] = m.winnerTeamId
    ? m.winnerTeamId === m.homeTeamId
      ? "home"
      : m.winnerTeamId === m.awayTeamId
        ? "away"
        : null
    : null;

  return {
    homeName: home?.name ?? "?",
    awayName: away?.name ?? "?",
    homeCode: home?.code ?? null,
    awayCode: away?.code ?? null,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    wentToPens: m.wentToPens ?? false,
    homePen: m.homeScorePen,
    awayPen: m.awayScorePen,
    stageLabel: stageLabel.toUpperCase(),
    dateLabel: m.scheduledAt ? dateLabel(m.scheduledAt) : null,
    venue: m.venue,
    winner,
  };
}
