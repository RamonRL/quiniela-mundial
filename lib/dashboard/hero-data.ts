import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import {
  groups,
  matchScorers,
  matches,
  players,
  predMatchResult,
  teams,
} from "@/lib/db/schema";
import { localizeTeams } from "@/lib/team-names";
import { formatDateTime } from "@/lib/utils";
import type { HeroData, HeroMatch, HeroScorer } from "@/components/dashboard/hero-card";

type MatchRow = {
  id: number;
  code: string;
  stage: string;
  groupId: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  status: "scheduled" | "live" | "finished";
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: Date;
  venue: string | null;
  matchdayId: number | null;
};

const liveMinute = (kickoff: Date) =>
  Math.max(1, Math.min(120, Math.floor((Date.now() - kickoff.getTime()) / 60000)));

/**
 * Construye los datos de la card principal del dashboard (HeroCard) a partir
 * del estado REAL del torneo, eligiendo la casuística:
 *  - Si hay partidos EN DIRECTO → protagonistas (1 o 2); contexto = lo que viene
 *    (o, si no hay, lo último jugado).
 *  - Si no hay directo → protagonista = el siguiente partido (cuenta atrás +
 *    estado del pronóstico del usuario); contexto = su pareja simultánea
 *    (· a la vez), lo anterior jugado y lo siguiente. Cubre las parejas
 *    simultáneas de la jornada 3.
 * Devuelve null si no hay nada que mostrar (p. ej. torneo terminado).
 */
export async function loadHeroData(args: {
  userId: string;
  leagueId: number;
  locale: string;
  timeZone: string | null;
}): Promise<HeroData | null> {
  const { userId, leagueId, locale, timeZone } = args;
  const t = await getTranslations("hero");
  const now = Date.now();

  const [rows, teamRows, groupRows] = await Promise.all([
    db
      .select({
        id: matches.id,
        code: matches.code,
        stage: matches.stage,
        groupId: matches.groupId,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        status: matches.status,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        scheduledAt: matches.scheduledAt,
        venue: matches.venue,
        matchdayId: matches.matchdayId,
      })
      .from(matches)
      .where(and(isNotNull(matches.homeTeamId), isNotNull(matches.awayTeamId)))
      .orderBy(asc(matches.scheduledAt)),
    db.select().from(teams),
    db.select({ id: groups.id, code: groups.code }).from(groups),
  ]);

  const all = rows as MatchRow[];
  if (all.length === 0) return null;

  const team = new Map(localizeTeams(teamRows, locale).map((tm) => [tm.id, { code: tm.code, name: tm.name }]));
  const groupCode = new Map(groupRows.map((g) => [g.id, g.code]));

  const live = all.filter((m) => m.status === "live");
  const upcoming = all.filter((m) => m.status !== "finished" && m.scheduledAt.getTime() > now);
  const finishedDesc = all.filter((m) => m.status === "finished").reverse(); // más reciente primero

  // Conciso, sin año (redundante): "jue, 11 jun, 21:00".
  const dateOf = (d: Date) =>
    formatDateTime(d, {
      timeZone: timeZone ?? undefined,
      locale,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  // Para las boxes (más corto, sin día de semana): "11 jun, 21:00".
  const shortDate = (d: Date) =>
    formatDateTime(d, {
      timeZone: timeZone ?? undefined,
      locale,
      day: "numeric",
      month: "short",
      year: undefined,
      hour: "2-digit",
      minute: "2-digit",
    });

  // Scorers de los partidos en directo destacados.
  const liveFeatured = live.slice(0, 2);
  const scorersByMatch = new Map<number, HeroScorer[]>();
  if (liveFeatured.length > 0) {
    const ids = liveFeatured.map((m) => m.id);
    const sc = await db
      .select({ matchId: matchScorers.matchId, playerId: matchScorers.playerId, teamId: matchScorers.teamId, minute: matchScorers.minute, og: matchScorers.isOwnGoal, pen: matchScorers.isPenalty })
      .from(matchScorers)
      .where(inArray(matchScorers.matchId, ids));
    const pids = [...new Set(sc.map((s) => s.playerId))];
    const pls = pids.length
      ? await db.select({ id: players.id, name: players.name }).from(players).where(inArray(players.id, pids))
      : [];
    const pname = new Map(pls.map((p) => [p.id, p.name]));
    for (const s of sc) {
      const arr = scorersByMatch.get(s.matchId) ?? [];
      arr.push({ name: pname.get(s.playerId) ?? "—", teamCode: team.get(s.teamId)?.code ?? "—", minute: s.minute, isOwnGoal: s.og, isPenalty: s.pen });
      scorersByMatch.set(s.matchId, arr);
    }
    for (const arr of scorersByMatch.values()) arr.sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  }

  const base = (m: MatchRow): HeroMatch => ({
    code: m.code,
    stage: m.stage,
    group: m.groupId != null ? groupCode.get(m.groupId) ?? null : null,
    home: m.homeTeamId != null ? team.get(m.homeTeamId) ?? null : null,
    away: m.awayTeamId != null ? team.get(m.awayTeamId) ?? null : null,
    status: m.status === "scheduled" ? "upcoming" : m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    href: `/partido/${m.id}`,
  });

  const asLive = (m: MatchRow): HeroMatch => ({
    ...base(m),
    minute: liveMinute(m.scheduledAt),
    scorers: scorersByMatch.get(m.id) ?? [],
  });
  const asUpcomingChip = (m: MatchRow, opts?: { sameTime?: boolean }): HeroMatch => ({
    ...base(m),
    kickoffISO: m.scheduledAt.toISOString(),
    dateLabel: shortDate(m.scheduledAt),
    note: opts?.sameTime ? t("sameTime") : null,
  });
  const asFinishedChip = (m: MatchRow): HeroMatch => ({ ...base(m), dateLabel: shortDate(m.scheduledAt) });

  // ─── Protagonista en directo ───
  if (liveFeatured.length > 0) {
    const featured = liveFeatured.map(asLive);
    let context: HeroMatch[];
    if (upcoming.length > 0) {
      context = upcoming.slice(0, 2).map((m) => asUpcomingChip(m));
    } else {
      context = finishedDesc.slice(0, 2).map(asFinishedChip);
    }
    return { featuredKind: "live", featured, context };
  }

  // ─── Protagonista = siguiente partido ───
  const next = upcoming[0];
  if (!next) return null; // nada en directo ni por venir (torneo terminado)

  const nextTime = next.scheduledAt.getTime();
  const matchdayId = next.matchdayId;
  const href = matchdayId != null ? `/predicciones/jornada/${matchdayId}/tour?match=${next.id}` : "/predicciones";
  const [pred] = await db
    .select({ matchId: predMatchResult.matchId })
    .from(predMatchResult)
    .where(and(eq(predMatchResult.userId, userId), eq(predMatchResult.leagueId, leagueId), eq(predMatchResult.matchId, next.id)))
    .limit(1);

  const featured: HeroMatch[] = [
    {
      ...base(next),
      kickoffISO: next.scheduledAt.toISOString(),
      dateLabel: dateOf(next.scheduledAt),
      venue: next.venue?.split("·")[0]?.trim() ?? null,
      prediction: { hasResult: Boolean(pred), href },
    },
  ];

  // Contexto: pareja simultánea (· a la vez) + lo anterior jugado + lo siguiente. Cap 3.
  const companions = upcoming.filter((m) => m.id !== next.id && m.scheduledAt.getTime() === nextTime);
  const following = upcoming.filter((m) => m.scheduledAt.getTime() > nextTime);
  const context: HeroMatch[] = [
    ...companions.map((m) => asUpcomingChip(m, { sameTime: true })),
    ...finishedDesc.slice(0, 2).map(asFinishedChip),
    ...following.slice(0, 2).map((m) => asUpcomingChip(m)),
  ].slice(0, 3);

  return { featuredKind: "next", featured, context };
}
