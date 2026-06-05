import { getLocale } from "next-intl/server";
import { localizedMatchdayName } from "@/lib/matchday-names";
import { localizeTeams } from "@/lib/team-names";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groups,
  matchdays,
  matches,
  players,
  predMatchResult,
  predMatchScorer,
  teams,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { getMatchdayState, isMatchClosed, type Stage } from "@/lib/matchday-state";
import { MatchdayTourClient } from "./tour-client";

export const metadata = { title: "Modo interactivo · Jornada" };
export const dynamic = "force-dynamic";

export default async function MatchdayTourPage(props: {
  params: Promise<{ matchdayId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const me = await requireUser();
  const locale = await getLocale();
  const leagueId = (await currentLeagueId(me))!;
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  const showScorer = mode === "completo";
  const params = await props.params;
  const matchdayId = parseInt(params.matchdayId, 10);
  if (!Number.isFinite(matchdayId)) notFound();

  const [day] = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);
  if (!day) notFound();

  const status = await getMatchdayState({ id: day.id, stage: day.stage as Stage });
  if (status.state !== "open") {
    redirect(`/predicciones/jornada/${matchdayId}`);
  }

  const allMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.matchdayId, matchdayId))
    .orderBy(asc(matches.scheduledAt));

  // Filtramos los partidos ya iniciados — en el tour solo aparecen los
  // editables. Si todos ya empezaron, no hay tour posible.
  const now = new Date();
  const openMatches = allMatches.filter((m) => !isMatchClosed(m, now));
  if (openMatches.length === 0) {
    redirect(`/predicciones/jornada/${matchdayId}`);
  }

  const teamIds = openMatches
    .flatMap((m) => [m.homeTeamId, m.awayTeamId])
    .filter((x): x is number => x != null);
  const matchIds = openMatches.map((m) => m.id);
  const groupIds = Array.from(
    new Set(openMatches.map((m) => m.groupId).filter((x): x is number => x != null)),
  );

  const [allTeams, allPlayers, allGroups, myResults, myScorers] = await Promise.all([
    teamIds.length > 0
      ? db.select().from(teams).where(inArray(teams.id, teamIds))
      : [],
    showScorer && teamIds.length > 0
      ? db
          .select()
          .from(players)
          .where(inArray(players.teamId, teamIds))
          .orderBy(asc(players.jerseyNumber))
      : [],
    groupIds.length > 0
      ? db.select().from(groups).where(inArray(groups.id, groupIds))
      : [],
    matchIds.length > 0
      ? db
          .select()
          .from(predMatchResult)
          .where(
            and(
              eq(predMatchResult.userId, me.id),
              eq(predMatchResult.leagueId, leagueId),
              inArray(predMatchResult.matchId, matchIds),
            ),
          )
      : [],
    showScorer && matchIds.length > 0
      ? db
          .select()
          .from(predMatchScorer)
          .where(
            and(
              eq(predMatchScorer.userId, me.id),
              eq(predMatchScorer.leagueId, leagueId),
              inArray(predMatchScorer.matchId, matchIds),
            ),
          )
      : [],
  ]);

  const teamById = new Map(localizeTeams(allTeams, locale).map((t) => [t.id, t]));
  const groupById = new Map(allGroups.map((g) => [g.id, g]));
  const playersByTeam = new Map<number, typeof allPlayers>();
  for (const p of allPlayers) {
    const arr = playersByTeam.get(p.teamId) ?? [];
    arr.push(p);
    playersByTeam.set(p.teamId, arr);
  }
  const resultByMatch = new Map(myResults.map((r) => [r.matchId, r]));
  const scorerByMatch = new Map(myScorers.map((r) => [r.matchId, r]));

  const matchItems = openMatches.map((m) => {
    const homeId = m.homeTeamId;
    const awayId = m.awayTeamId;
    const result = resultByMatch.get(m.id);
    const scorer = scorerByMatch.get(m.id);
    return {
      id: m.id,
      stage: m.stage as Stage,
      groupCode: m.groupId ? groupById.get(m.groupId)?.code ?? null : null,
      scheduledAt: m.scheduledAt.toISOString(),
      venue: m.venue,
      home: homeId
        ? {
            id: homeId,
            name: teamById.get(homeId)?.name ?? "—",
            code: teamById.get(homeId)?.code ?? "—",
          }
        : null,
      away: awayId
        ? {
            id: awayId,
            name: teamById.get(awayId)?.name ?? "—",
            code: teamById.get(awayId)?.code ?? "—",
          }
        : null,
      homePlayers: (homeId ? playersByTeam.get(homeId) ?? [] : []).map((p) => ({
        id: p.id,
        teamId: p.teamId,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        position: p.position,
        photoUrl: p.photoUrl,
      })),
      awayPlayers: (awayId ? playersByTeam.get(awayId) ?? [] : []).map((p) => ({
        id: p.id,
        teamId: p.teamId,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        position: p.position,
        photoUrl: p.photoUrl,
      })),
      existing: result
        ? {
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            willGoToPens: result.willGoToPens,
            winnerTeamId: result.winnerTeamId,
          }
        : null,
      existingScorerPlayerId: scorer?.playerId ?? null,
    };
  });

  // Primer match no predicho — donde se reanuda el paso a paso. En completo
  // hace falta marcador Y goleador; en marcador / solo_ganador basta con que
  // exista la predicción de resultado.
  let firstUnpredicted = -1;
  matchItems.forEach((m, idx) => {
    if (firstUnpredicted !== -1) return;
    const pending = showScorer
      ? !m.existing || m.existingScorerPlayerId == null
      : !m.existing;
    if (pending) {
      firstUnpredicted = idx;
    }
  });
  const allComplete = firstUnpredicted === -1;
  const defaultStep = allComplete ? 0 : firstUnpredicted;
  const sp = await props.searchParams;
  const fromUrl = sp.step != null ? parseInt(sp.step, 10) : NaN;
  const initialStep = Number.isFinite(fromUrl)
    ? Math.max(0, Math.min(matchItems.length - 1, fromUrl))
    : defaultStep;

  return (
    <MatchdayTourClient
      matchdayId={matchdayId}
      matchdayName={localizedMatchdayName(day.name, day.stage, locale)}
      matches={matchItems}
      initialStep={initialStep}
      allCompleteOnEntry={allComplete}
      mode={mode}
    />
  );
}
