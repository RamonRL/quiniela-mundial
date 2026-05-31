import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { ScoringBox } from "@/components/brand/scoring-box";
import { Lock } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { MATCH_SCORING_BY_MODE } from "@/lib/scoring/copy";
import { formatDateTime } from "@/lib/utils";
import { getMatchdayState, isMatchClosed, type Stage } from "@/lib/matchday-state";
import { EmptyState } from "@/components/shell/empty-state";
import { MATCH_FOOTNOTE } from "@/lib/scoring/copy";
import { InteractiveModeBanner } from "@/components/predictions/interactive-mode-banner";
import { MatchdayPredictionForm } from "./matchday-form";

export default async function PredictMatchdayPage({
  params,
}: {
  params: Promise<{ matchdayId: string }>;
}) {
  const me = await requireUser();
  const leagueId = (await currentLeagueId(me))!;
  const userTz = me.timezone ?? undefined;
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  const { matchdayId: idParam } = await params;
  const matchdayId = Number(idParam);
  if (!Number.isFinite(matchdayId)) notFound();
  const [day] = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);
  if (!day) notFound();

  const status = await getMatchdayState({
    id: day.id,
    stage: day.stage as Stage,
  });

  if (status.state === "waiting") {
    return (
      <div className="space-y-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="px-0 text-[var(--color-muted-foreground)]"
        >
          <Link href="/predicciones">
            <ArrowLeft />
            Mis predicciones
          </Link>
        </Button>
        <PageHeader eyebrow={day.stage.toUpperCase()} title={day.name} description={status.reason} />
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Bloqueada"
          description={`${status.reason} Cuando se desbloquee tendrás hasta ${formatDateTime(day.predictionDeadlineAt, { timeZone: userTz })} para predecir.`}
        />
      </div>
    );
  }

  const matchRows = await db
    .select()
    .from(matches)
    .where(eq(matches.matchdayId, matchdayId))
    .orderBy(asc(matches.scheduledAt));

  const teamIds = matchRows
    .flatMap((m) => [m.homeTeamId, m.awayTeamId])
    .filter((x): x is number => x != null);
  const matchIds = matchRows.map((m) => m.id);
  const groupIds = Array.from(
    new Set(
      matchRows.map((m) => m.groupId).filter((x): x is number => x != null),
    ),
  );

  const allTeams =
    teamIds.length > 0
      ? await db.select().from(teams).where(inArray(teams.id, teamIds))
      : [];
  // Cargamos los grupos referenciados por los partidos para poder pintar
  // "Grupo A/B/C…" en el badge del card en lugar del genérico "GROUP".
  const allGroups =
    groupIds.length > 0
      ? await db.select().from(groups).where(inArray(groups.id, groupIds))
      : [];
  const groupById = new Map(allGroups.map((g) => [g.id, g]));
  const allPlayers =
    teamIds.length > 0
      ? await db
          .select()
          .from(players)
          .where(inArray(players.teamId, teamIds))
          .orderBy(asc(players.jerseyNumber))
      : [];
  const myResults =
    matchIds.length > 0
      ? await db
          .select()
          .from(predMatchResult)
          .where(
            and(
              eq(predMatchResult.userId, me.id),
              eq(predMatchResult.leagueId, leagueId),
              inArray(predMatchResult.matchId, matchIds),
            ),
          )
      : [];
  const myScorers =
    matchIds.length > 0
      ? await db
          .select()
          .from(predMatchScorer)
          .where(
            and(
              eq(predMatchScorer.userId, me.id),
              eq(predMatchScorer.leagueId, leagueId),
              inArray(predMatchScorer.matchId, matchIds),
            ),
          )
      : [];

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const playersByTeam = new Map<number, typeof allPlayers>();
  for (const p of allPlayers) {
    const arr = playersByTeam.get(p.teamId) ?? [];
    arr.push(p);
    playersByTeam.set(p.teamId, arr);
  }
  const resultByMatch = new Map(myResults.map((r) => [r.matchId, r]));
  const scorerByMatch = new Map(myScorers.map((r) => [r.matchId, r]));

  const open = status.state === "open";

  // Modo paso a paso por defecto (solo modo completo) mientras quede algún
  // partido abierto sin marcador + goleador. Los partidos ya empezados
  // (closed) no cuentan. En marcador/solo_ganador el tour aún no aplica:
  // se usa el formulario full mode-aware de abajo.
  if (open && mode === "completo") {
    const nowD = new Date();
    const anyOpenPending = matchRows.some((m) => {
      if (isMatchClosed(m, nowD)) return false;
      const result = resultByMatch.get(m.id);
      const scorer = scorerByMatch.get(m.id);
      return !result || !scorer;
    });
    if (anyOpenPending) {
      redirect(`/predicciones/jornada/${matchdayId}/tour`);
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/predicciones">
          <ArrowLeft />
          Mis predicciones
        </Link>
      </Button>
      <PageHeader
        eyebrow={day.stage.toUpperCase()}
        title={day.name}
        description={
          open
            ? `Cierra el ${formatDateTime(day.predictionDeadlineAt, { timeZone: userTz })}. Marcador y goleador en una sola jugada.`
            : `Cierre pasado: ${formatDateTime(day.predictionDeadlineAt, { timeZone: userTz })}.`
        }
      />
      {open && mode === "completo" ? (
        <InteractiveModeBanner
          href={`/predicciones/jornada/${day.id}/tour`}
          hint="Repasa partido a partido."
        />
      ) : null}
      <ScoringBox sections={MATCH_SCORING_BY_MODE[mode]} footnote={MATCH_FOOTNOTE} />
      <MatchdayPredictionForm
        matchdayId={day.id}
        open={open}
        mode={mode}
        matches={matchRows.map((m) => {
          const homeId = m.homeTeamId;
          const awayId = m.awayTeamId;
          const homePlayers = homeId ? playersByTeam.get(homeId) ?? [] : [];
          const awayPlayers = awayId ? playersByTeam.get(awayId) ?? [] : [];
          const result = resultByMatch.get(m.id);
          const scorer = scorerByMatch.get(m.id);
          return {
            id: m.id,
            stage: m.stage,
            groupCode: m.groupId ? groupById.get(m.groupId)?.code ?? null : null,
            scheduledAt: m.scheduledAt.toISOString(),
            venue: m.venue,
            home: homeId
              ? {
                  id: homeId,
                  name: teamById.get(homeId)?.name ?? "—",
                  code: teamById.get(homeId)?.code ?? "—",
                  flagUrl: teamById.get(homeId)?.flagUrl ?? null,
                }
              : null,
            away: awayId
              ? {
                  id: awayId,
                  name: teamById.get(awayId)?.name ?? "—",
                  code: teamById.get(awayId)?.code ?? "—",
                  flagUrl: teamById.get(awayId)?.flagUrl ?? null,
                }
              : null,
            homePlayers: homePlayers.map((p) => ({
              id: p.id,
              name: p.name,
              jerseyNumber: p.jerseyNumber,
              position: p.position,
            })),
            awayPlayers: awayPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              jerseyNumber: p.jerseyNumber,
              position: p.position,
            })),
            existing: result
              ? {
                  homeScore: result.homeScore,
                  awayScore: result.awayScore,
                  willGoToPens: result.willGoToPens,
                  winnerTeamId: result.winnerTeamId ?? null,
                }
              : null,
            existingScorerPlayerId: scorer?.playerId ?? null,
          };
        })}
      />
    </div>
  );
}
