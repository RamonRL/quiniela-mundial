import { Suspense } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { TeamFlag } from "@/components/brand/team-flag";
import { ArrowRight, ArrowUpRight, CalendarDays, Crown, Flame, Trophy } from "lucide-react";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagues,
  matchScorers,
  matchdays,
  matches,
  players,
  pointsLedger,
  predBracketSlot,
  predGroupRanking,
  predMatchScorer,
  predSpecial,
  predTournamentTopScorer,
  specialPredictions,
  teams,
} from "@/lib/db/schema";
import { LeagueWelcomeDialog } from "@/components/leagues/league-welcome-dialog";
import { Badge } from "@/components/ui/badge";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { requireUser } from "@/lib/auth/guards";
import { TutorialAutoStart } from "@/components/tutorial/auto-start";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { ActivityFeedCard } from "./activity-feed-card";
import { DashboardNewsStrip } from "./news-strip";
import { ImportPredictionsBanner } from "@/components/predictions/import-banner";
import { loadOpenMatchdays, type OpenMatchdayEntry } from "@/lib/deadlines";
import { getBracketStatus } from "@/lib/bracket-state";
import { ProgressHub, type ProgressHubProps } from "@/components/dashboard/progress-hub";
import { UpcomingRoundsStrip } from "@/components/dashboard/upcoming-rounds-strip";
import { GroupStandingsSlider } from "@/components/dashboard/group-standings-slider";
import { PatchNotesBoard } from "@/components/dashboard/patch-notes-board";
import {
  countLeagueMembers,
  loadLeaderboard,
  type LeaderboardEntry,
} from "@/lib/leaderboard";

const KICKOFF = process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z";

// Claves i18n (namespace "dashboard") por fase — se traducen en el render.
const STAGE_BADGE: Record<string, string> = {
  group: "stageGroup",
  r32: "stageR32",
  r16: "stageR16",
  qf: "stageQf",
  sf: "stageSf",
  third: "stageThird",
  final: "stageFinal",
};

const QUERY_TIMEOUT_MS = 5000;

/**
 * Resuelve la promesa con `fallback` si tarda más de `timeoutMs` o si rechaza.
 * Mantiene el dashboard renderable aunque Supabase tenga statement timeouts,
 * QUIC drops o pool exhaustion en alguna query individual.
 */
function safe<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
  timeoutMs = QUERY_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error(`dashboard query timeout: ${label} (>${timeoutMs}ms)`);
      resolve(fallback);
    }, timeoutMs);
    promise.then(
      (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.error(`dashboard query failed: ${label}`, err);
        resolve(fallback);
      },
    );
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ welcome?: string }>;
}) {
  const me = await requireUser();
  const t = await getTranslations("dashboard");
  const params = (await searchParams) ?? {};
  const MARQUEE_TOKENS = [
    t("mqWorldCup"),
    t("mqCanada"),
    t("mqMexico"),
    t("mqUsa"),
    t("mqDates"),
    t("mqTeams"),
    t("mqMatches"),
  ];
  const leagueId = (await currentLeagueId(me))!;
  // ?welcome=1 → acaba de unirse a esta liga por invite link (o terminó
  // el onboarding habiendo entrado por uno). Cargamos nombre/logo para el
  // popup de bienvenida; solo aplica a privadas.
  let welcomeLeague: { name: string; logoUrl: string | null } | null = null;
  if (params.welcome) {
    const [row] = await safe(
      db
        .select({ name: leagues.name, logoUrl: leagues.logoUrl, isPublic: leagues.isPublic })
        .from(leagues)
        .where(eq(leagues.id, leagueId))
        .limit(1),
      [] as Array<{ name: string; logoUrl: string | null; isPublic: boolean }>,
      "welcomeLeague",
    );
    if (row && !row.isPublic) {
      welcomeLeague = { name: row.name, logoUrl: row.logoUrl };
    }
  }
  // Modo de la liga activa. Marcador / Solo Ganador NO tienen pre-torneo
  // (grupos, bota, especiales) ni bracket: solo se predicen partidos. El
  // "puesto de mando" se simplifica para que no aparezcan esas categorías.
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  const onlyMatches = mode !== "completo";
  // TZ del usuario para horarios de partidos; null → fallback Spain TZ.
  const userTz = me.timezone ?? undefined;
  const kickoff = new Date(KICKOFF);
  const tournamentStarted = kickoff.getTime() <= Date.now();
  const days = Math.max(0, Math.ceil((kickoff.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // Pre-torneo nadie tiene puntos: no hay nada que rankear ni actividad
  // que listar, así que evitamos por completo `myPoints`, `leagueHasPoints`,
  // `loadLeaderboard`, `loadActivityFeed` y `pendingScorerCount`. Pasamos
  // de ~8 queries a ~6 pre-torneo, y a la mitad de coste agregado.
  const computeRanking = tournamentStarted;

  const [
    upcomingMatchdays,
    groupCount,
    topScorerSet,
    mySpecialsRow,
    totalSpecialsRow,
    recentMatch,
    nextMatch,
    liveMatchRows,
    bracketStatus,
    bracketFilledRow,
    openMatchdays,
    pendingScorerCount,
    myPointsRows,
    leaderboardEntries,
    leagueMemberCountFallback,
  ] = await Promise.all([
    safe(
      db
        .select()
        .from(matchdays)
        .where(gt(matchdays.predictionDeadlineAt, new Date()))
        .orderBy(asc(matchdays.predictionDeadlineAt))
        .limit(1),
      [] as Array<typeof matchdays.$inferSelect>,
      "upcomingMatchdays",
    ),
    safe(
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(predGroupRanking)
        .where(
          and(
            eq(predGroupRanking.userId, me.id),
            eq(predGroupRanking.leagueId, leagueId),
          ),
        ),
      [{ c: 0 }] as Array<{ c: number }>,
      "groupCount",
    ),
    safe(
      db
        .select()
        .from(predTournamentTopScorer)
        .where(
          and(
            eq(predTournamentTopScorer.userId, me.id),
            eq(predTournamentTopScorer.leagueId, leagueId),
          ),
        )
        .limit(1),
      [] as Array<typeof predTournamentTopScorer.$inferSelect>,
      "topScorerSet",
    ),
    safe(
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(predSpecial)
        .where(and(eq(predSpecial.userId, me.id), eq(predSpecial.leagueId, leagueId))),
      [{ c: 0 }] as Array<{ c: number }>,
      "mySpecialsRow",
    ),
    safe(
      db.select({ c: sql<number>`count(*)::int` }).from(specialPredictions),
      [{ c: 0 }] as Array<{ c: number }>,
      "totalSpecialsRow",
    ),
    safe(
      db
        .select()
        .from(matches)
        .where(eq(matches.status, "finished"))
        .orderBy(desc(matches.scheduledAt))
        .limit(3),
      [] as Array<typeof matches.$inferSelect>,
      "recentMatch",
    ),
    safe(
      db
        .select()
        .from(matches)
        .where(gt(matches.scheduledAt, new Date()))
        .orderBy(asc(matches.scheduledAt))
        .limit(1),
      [] as Array<typeof matches.$inferSelect>,
      "nextMatch",
    ),
    safe(
      db
        .select()
        .from(matches)
        .where(eq(matches.status, "live"))
        .orderBy(asc(matches.scheduledAt))
        .limit(1),
      [] as Array<typeof matches.$inferSelect>,
      "liveMatchRows",
    ),
    safe(
      getBracketStatus(),
      { state: "waiting" as const, closesAt: null as Date | null },
      "bracketStatus",
    ),
    safe(
      db
        .select({ c: sql<number>`count(*) filter (where predicted_team_id is not null)::int` })
        .from(predBracketSlot)
        .where(
          and(
            eq(predBracketSlot.userId, me.id),
            eq(predBracketSlot.leagueId, leagueId),
          ),
        ),
      [{ c: 0 }] as Array<{ c: number }>,
      "bracketFilledRow",
    ),
    // Reusa la misma función cacheada que alimenta al deadline banner del
    // layout. React.cache() dedupe la query: cero round-trips extra.
    safe(
      tournamentStarted || onlyMatches
        ? loadOpenMatchdays(me.id, leagueId)
        : Promise.resolve([] as OpenMatchdayEntry[]),
      [] as OpenMatchdayEntry[],
      "openMatchdays",
    ),
    safe(
      tournamentStarted
        ? db
            .select({ c: sql<number>`count(*)::int` })
            .from(matches)
            .leftJoin(
              predMatchScorer,
              and(
                eq(predMatchScorer.matchId, matches.id),
                eq(predMatchScorer.userId, me.id),
                eq(predMatchScorer.leagueId, leagueId),
              ),
            )
            .where(
              and(
                gt(matches.scheduledAt, new Date()),
                sql`${predMatchScorer.matchId} is null`,
              ),
            )
        : Promise.resolve([{ c: 0 }]),
      [{ c: 0 }] as Array<{ c: number }>,
      "pendingScorerCount",
    ),
    safe(
      tournamentStarted
        ? db
            .select({ total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` })
            .from(pointsLedger)
            .where(and(eq(pointsLedger.userId, me.id), eq(pointsLedger.leagueId, leagueId)))
        : Promise.resolve([{ total: 0 }]),
      [{ total: 0 }] as Array<{ total: number }>,
      "myPointsRows",
    ),
    safe(
      computeRanking ? loadLeaderboard(leagueId) : Promise.resolve([]),
      [] as LeaderboardEntry[],
      "leaderboardEntries",
    ),
    safe(
      computeRanking ? Promise.resolve(0) : countLeagueMembers(leagueId),
      0,
      "leagueMemberCountFallback",
    ),
  ]);
  const myPoints = myPointsRows[0]?.total ?? 0;

  // Activity feed se ha movido a un async Server Component dentro de
  // <Suspense> más abajo — descongestiona el critical path: la página
  // hace su primer paint sin esperar a `loadActivityFeed`, que streamea
  // su HTML cuando esté listo.
  const liveMatch = liveMatchRows[0] ?? null;
  const sorted = leaderboardEntries;
  const totalParticipants = computeRanking ? sorted.length : leagueMemberCountFallback;
  const myPosition =
    sorted.length > 0 && myPoints > 0
      ? sorted.findIndex((r) => r.userId === me.id) + 1 || null
      : null;
  const pendingScorers = pendingScorerCount[0]?.c ?? 0;

  const teamIds = [...recentMatch, ...nextMatch, ...(liveMatch ? [liveMatch] : [])]
    .flatMap((m) => [m.homeTeamId, m.awayTeamId])
    .filter((x): x is number => x != null);
  const teamRows =
    teamIds.length > 0
      ? await safe(
          db
            .select()
            .from(teams)
            .where(sql`id = ANY(${sql.raw(`ARRAY[${teamIds.join(",")}]::int[]`)})`),
          [] as Array<typeof teams.$inferSelect>,
          "teamRows",
        )
      : [];
  const teamById = new Map(teamRows.map((tm) => [tm.id, tm]));
  const next = nextMatch[0];
  const nextHome = next?.homeTeamId ? teamById.get(next.homeTeamId) ?? null : null;
  const nextAway = next?.awayTeamId ? teamById.get(next.awayTeamId) ?? null : null;

  // Live HUD data: the active match's flags, scorers in chronological order.
  const liveHome = liveMatch?.homeTeamId ? teamById.get(liveMatch.homeTeamId) ?? null : null;
  const liveAway = liveMatch?.awayTeamId ? teamById.get(liveMatch.awayTeamId) ?? null : null;
  const liveScorerRows = liveMatch
    ? await safe(
        db.select().from(matchScorers).where(eq(matchScorers.matchId, liveMatch.id)),
        [] as Array<typeof matchScorers.$inferSelect>,
        "liveScorerRows",
      )
    : [];

  const liveScorerPlayerIds = liveScorerRows.map((s) => s.playerId);
  const livePlayerRows =
    liveScorerPlayerIds.length > 0
      ? await safe(
          db
            .select()
            .from(players)
            .where(sql`id = ANY(${sql.raw(`ARRAY[${liveScorerPlayerIds.join(",")}]::int[]`)})`),
          [] as Array<typeof players.$inferSelect>,
          "livePlayerRows",
        )
      : [];
  const livePlayerById = new Map(livePlayerRows.map((p) => [p.id, p]));
  const liveMinute =
    liveMatch != null
      ? Math.max(
          1,
          Math.min(
            120,
            Math.floor((Date.now() - new Date(liveMatch.scheduledAt).getTime()) / 60000),
          ),
        )
      : null;

  const greeting = me.nickname || me.email.split("@")[0];
  const podium = sorted.slice(0, 5);

  // Pre-torneo progress: 3 categories — group rankings, top scorer, specials.
  const groupsFilled = groupCount[0]?.c ?? 0;
  const groupsTotal = 12;
  const groupsDone = groupsFilled === groupsTotal;
  const topScorerDone = topScorerSet.length > 0;
  const totalSpecials = totalSpecialsRow[0]?.c ?? 0;
  const mySpecials = mySpecialsRow[0]?.c ?? 0;
  const specialsDone = totalSpecials > 0 && mySpecials >= totalSpecials;
  const preTorneoComplete =
    [groupsDone, topScorerDone, specialsDone].filter(Boolean).length;
  const preTorneoTotal = 3;
  const myEntry = sorted.find((r) => r.userId === me.id) ?? null;
  const exactScores = myEntry?.exactScoresCount ?? 0;

  // Compute live progress-hub props.
  const bracketFilled = bracketFilledRow[0]?.c ?? 0;
  const BRACKET_TOTAL_SLOTS = 32; // r16(16) + qf(8) + sf(4) + final(2 + champ 1) + third(1)
  // En modos Marcador / Solo Ganador no hay donut de pre-torneo: se muestra
  // siempre el hub "running" (próxima jornada a predecir), sin bracket ni
  // enlace a picks pre-torneo, aunque el torneo no haya arrancado.
  const progressHubProps: ProgressHubProps =
    !tournamentStarted && !onlyMatches
      ? {
          phase: "pre",
          nickname: me.nickname,
          groupsFilled,
          groupsTotal,
          topScorerDone,
          specialsFilled: mySpecials,
          specialsTotal: totalSpecials,
        }
      : buildRunningHubProps({
          openMatchdays,
          bracketLabel: t("bracketDeadline"),
          bracket:
            !onlyMatches &&
            (bracketStatus.state === "open" || bracketStatus.state === "closed")
              ? {
                  state: bracketStatus.state,
                  closesAt: bracketStatus.closesAt
                    ? new Date(bracketStatus.closesAt).toISOString()
                    : null,
                  filled: bracketFilled,
                  total: BRACKET_TOTAL_SLOTS,
                }
              : undefined,
          preTorneoComplete: onlyMatches ? 0 : preTorneoComplete,
          preTorneoTotal: onlyMatches ? 0 : preTorneoTotal,
          compact: onlyMatches,
        });

  return (
    <div className="space-y-10">
      {welcomeLeague ? (
        <LeagueWelcomeDialog
          leagueName={welcomeLeague.name}
          logoUrl={welcomeLeague.logoUrl}
        />
      ) : null}
      <TutorialAutoStart firstSeen={me.tutorialCompletedAt == null} />
      <Suspense fallback={<div aria-hidden />}>
        <ImportPredictionsBanner userId={me.id} activeLeagueId={leagueId} />
      </Suspense>

      {/* FWC26 mark — centrado, encima de la barra dinámica */}
      <div className="flex flex-col items-center gap-1.5 pt-2">
        <Image
          src="/fwc26.png"
          alt="FIFA World Cup 26"
          width={1500}
          height={1500}
          priority
          className="h-14 w-auto sm:h-16"
        />
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] sm:text-[0.6rem]">
          {t("fifaWorldCup")}
        </p>
      </div>

      {/* Marquee strip */}
      <div className="-mx-4 overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface)] py-2 lg:-mx-8">
        <div className="marquee flex w-max items-center gap-8 whitespace-nowrap font-display text-xs uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex items-center gap-8 pr-8">
              {MARQUEE_TOKENS.map((token, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-8">
                  <span>{token}</span>
                  <span className="size-1 rounded-full bg-[var(--color-arena)]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Live HUD — appears only when a match is currently in play */}
      {liveMatch ? (
        <div className="group relative overflow-hidden rounded-2xl border-2 border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)] transition-all hover:-translate-y-0.5">
          <Link
            href={`/partido/${liveMatch.id}`}
            aria-label={`Partido ${liveMatch.code}`}
            className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
          />
          <RealtimeRefresher
            channelKey={`live-hud:${liveMatch.id}`}
            subscriptions={[
              { table: "matches", filter: `id=eq.${liveMatch.id}` },
              { table: "match_scorers", filter: `match_id=eq.${liveMatch.id}` },
            ]}
          />
          <div className="halftone pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
          <div className="relative space-y-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
                </span>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
                  {t("live")} · {liveMatch.code}
                </span>
              </div>
              {liveMinute != null ? (
                <span className="font-display tabular text-2xl text-[var(--color-arena)] glow-arena">
                  {liveMinute}
                  <span className="text-base">′</span>
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
              <LiveTeam team={liveHome} />
              <span className="font-display tabular text-5xl leading-none tracking-tighter sm:text-7xl">
                {liveMatch.homeScore ?? 0}
                <span className="mx-1 text-[var(--color-muted-foreground)] opacity-60 sm:mx-2">·</span>
                {liveMatch.awayScore ?? 0}
              </span>
              <LiveTeam team={liveAway} align="end" />
            </div>
            {liveScorerRows.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-[var(--color-arena)]/30 pt-3">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  {t("goals")}
                </span>
                {[...liveScorerRows]
                  .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999))
                  .map((s) => {
                    const p = livePlayerById.get(s.playerId);
                    const scorerTeam = teamById.get(s.teamId);
                    return (
                      <span
                        key={s.id}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs"
                      >
                        <Badge variant="outline" className="text-[0.55rem]">
                          {scorerTeam?.code ?? "?"}
                        </Badge>
                        <span className="font-medium">{p?.name ?? t("player")}</span>
                        {s.minute != null ? (
                          <span className="font-mono text-[0.6rem] text-[var(--color-muted-foreground)]">
                            {s.minute}′
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Hero */}
      <section className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="spotlight absolute inset-0" aria-hidden />
        <div className="pitch-grid absolute inset-0 opacity-30" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[var(--color-arena)]" />
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  {t("hi")} · {greeting}
                </span>
              </div>
              <p className="font-editorial text-lg italic leading-snug text-[var(--color-muted-foreground)]">
                {t("countdownLead")}
              </p>
            </div>
            <div className="-my-2 flex items-end gap-4">
              <span className="font-display glow-arena text-[8rem] leading-[0.85] tracking-tighter sm:text-[11rem]">
                {days.toString().padStart(2, "0")}
              </span>
              <div className="mb-4 flex flex-col gap-1">
                <span className="font-display text-3xl tracking-tight">
                  {t("days")}
                </span>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  {t("toKickoff")}
                </span>
              </div>
            </div>
            <p className="font-editorial text-base italic text-[var(--color-muted-foreground)] sm:text-lg">
              {formatDateTime(kickoff, {
                timeZone: userTz,
                weekday: "long",
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Right column — next match & up next deadline */}
          <div className="flex flex-col gap-4">
            {next ? (
              <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] transition-colors hover:border-[var(--color-arena)]/60">
                <Link
                  href={`/partido/${next.id}`}
                  aria-label={`Partido ${next.code}`}
                  className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
                />
                <div className="pointer-events-none relative flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-3)]/40 px-4 py-2">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                    {t("nextMatch")} · {next.code}
                  </span>
                  <ArrowUpRight className="size-3.5 text-[var(--color-muted-foreground)] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
                <div className="pointer-events-none relative space-y-4 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <TeamCell team={nextHome} align="start" />
                    <span className="font-display text-2xl text-[var(--color-muted-foreground)]">
                      {t("vs")}
                    </span>
                    <TeamCell team={nextAway} align="end" />
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted-foreground)]">
                    <span>
                      {formatDateTime(next.scheduledAt, {
                        timeZone: userTz,
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {next.venue ? (
                      <span className="truncate">{next.venue.split("·")[0].trim()}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
                {t("noUpcoming")}
              </div>
            )}

            <Link
              href={
                upcomingMatchdays[0]
                  ? `/predicciones/jornada/${upcomingMatchdays[0].id}`
                  : "/predicciones"
              }
              className="group flex items-center justify-between rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] p-4 transition hover:border-[var(--color-arena)]"
            >
              <div className="flex items-center gap-3">
                <Flame className="size-5 text-[var(--color-arena)]" />
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                    {t("nextDeadline")}
                  </p>
                  <p className="font-display text-xl tracking-tight">
                    {upcomingMatchdays[0]?.name ?? t("noActiveMatchday")}
                  </p>
                  {upcomingMatchdays[0] ? (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDateTime(upcomingMatchdays[0].predictionDeadlineAt, {
                        timeZone: userTz,
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
              <ArrowRight className="size-4 text-[var(--color-arena)] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Puesto de mando — wrap del tutorial. ProgressHub es el
          centerpiece visual (donut + satellites pre-torneo · countdown
          en torneo) y, debajo, el slider de próximas rondas para
          predecir resultados. El tutorial los ilumina juntos como una
          sola "base de operaciones" del usuario. La cabecera adapta el
          H2 según si el torneo ya empezó o no. */}
      <section data-tutorial-id="progress-hub" className="space-y-6">
        <header className="space-y-1">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("commandPost")}
          </p>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {tournamentStarted || onlyMatches
              ? t("nextPlay")
              : t("whatsLeft")}
          </h2>
        </header>
        <div className="space-y-10">
          <ProgressHub {...progressHubProps} />
          {/* En Marcador / Solo Ganador el grid del puesto de mando ya
              lista las jornadas; el strip de "próximas rondas" duplicaría. */}
          {onlyMatches ? null : (
            <UpcomingRoundsStrip userId={me.id} leagueId={leagueId} />
          )}
        </div>
      </section>

      {/* Scoreboard stats — solo en-torneo (pre-torneo todo es 0/--). */}
      {tournamentStarted ? (
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("statPosition")}
          value={myPosition != null ? `${myPosition.toString().padStart(2, "0")}` : "--"}
          prefix={myPosition != null ? "#" : null}
          hint={
            myPosition != null
              ? t("statPositionOf", { n: totalParticipants })
              : totalParticipants > 1
                ? t("statWaitingPlayers", { n: totalParticipants })
                : t("statWaitingFirst")
          }
          accent
          href={`/ranking/${me.id}`}
        />
        <Stat label={t("statPoints")} value={myPoints.toString()} hint={t("statPointsHint")} />
        <Stat
          label={t("statScorersPending")}
          value={pendingScorers.toString()}
          hint={t("statScorersHint")}
        />
        <Stat
          label={t("statExact")}
          value={exactScores.toString()}
          hint={t("statExactHint")}
        />
      </section>
      ) : null}

      {/* Slider preview de los 12 grupos (banderas + puntos). Server
          component, scroll horizontal con barra solo en PC y touch en
          móvil. Aparece siempre — pre-torneo muestra el sorteo (todo 0
          pts), durante el torneo muestra cómo van. */}
      <Suspense fallback={null}>
        <GroupStandingsSlider />
      </Suspense>

      {/* Activity feed — streamed via Suspense (su query no bloquea el
          shell del dashboard). Solo aparece si el usuario tiene puntos. */}
      {myPoints > 0 ? (
        <Suspense fallback={null}>
          <ActivityFeedCard userId={me.id} leagueId={leagueId} myPoints={myPoints} />
        </Suspense>
      ) : null}

      {/* Body — resultados recientes + podio. Layout 2 columnas con paneles
          de altura igual para que el dashboard cierre balanceado. */}
      <section className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        {/* Resultados recientes — panel editorial scoreboard */}
        <div className="rise-in relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
          <header className="relative flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[var(--color-arena)]" />
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {t("recentResults")}
              </p>
            </div>
            <Link
              href="/calendario"
              className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
            >
              {t("calendarArrow")}
            </Link>
          </header>
          <div className="relative flex-1 p-3">
            {recentMatch.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted-foreground)]">
                  <CalendarDays className="size-5" />
                </span>
                <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                  {t("noWhistles")}
                </p>
                <Link
                  href="/calendario"
                  className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-arena)] hover:underline"
                >
                  {t("seeCalendar")} <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentMatch.map((m) => {
                  const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                  const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                  const hs = m.homeScore ?? 0;
                  const as = m.awayScore ?? 0;
                  const winnerSide: "home" | "away" | "draw" =
                    m.winnerTeamId != null
                      ? m.winnerTeamId === m.homeTeamId
                        ? "home"
                        : "away"
                      : hs > as
                        ? "home"
                        : as > hs
                          ? "away"
                          : "draw";
                  return (
                    <li
                      key={m.id}
                      className="group relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] transition hover:border-[var(--color-arena)]/45 hover:shadow-[var(--shadow-elev-1)]"
                    >
                      <Link
                        href={`/partido/${m.id}`}
                        aria-label={`Partido ${m.code}`}
                        className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
                      />
                      <div className="pointer-events-none relative flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-3)]/40 px-3 py-1">
                        <span className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                          {STAGE_BADGE[m.stage] ? t(STAGE_BADGE[m.stage]) : m.stage.toUpperCase()} · {m.code}
                        </span>
                        <span className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                          {formatDateTime(m.scheduledAt, {
                            timeZone: userTz,
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-3">
                        <TeamSide
                          team={home}
                          align="start"
                          isWinner={winnerSide === "home"}
                          isLoser={winnerSide === "away"}
                        />
                        <span className="font-display tabular text-2xl leading-none tracking-tighter sm:text-3xl">
                          <span
                            className={
                              winnerSide === "home"
                                ? "text-[var(--color-arena)] glow-arena"
                                : winnerSide === "draw"
                                  ? ""
                                  : "text-[var(--color-muted-foreground)]"
                            }
                          >
                            {hs}
                          </span>
                          <span className="mx-1 text-[var(--color-muted-foreground)] opacity-50">·</span>
                          <span
                            className={
                              winnerSide === "away"
                                ? "text-[var(--color-arena)] glow-arena"
                                : winnerSide === "draw"
                                  ? ""
                                  : "text-[var(--color-muted-foreground)]"
                            }
                          >
                            {as}
                          </span>
                        </span>
                        <TeamSide
                          team={away}
                          align="end"
                          isWinner={winnerSide === "away"}
                          isLoser={winnerSide === "home"}
                        />
                      </div>
                      {m.wentToPens ? (
                        <p className="relative border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-3)]/30 px-3 py-1 text-center font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                          {t("penalties")} · {m.homeScorePen ?? 0}–{m.awayScorePen ?? 0}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Cabeza de tabla — top 5 con podio destacado */}
        <div className="rise-in relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
          <header className="relative flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-[var(--color-arena)]" />
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {t("top5")}
              </p>
            </div>
            <Link
              href="/ranking"
              className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
            >
              {t("rankingArrow")}
            </Link>
          </header>
          <div className="relative flex-1 p-3">
            {podium.length === 0 || podium[0].totalPoints === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted-foreground)]">
                  <Trophy className="size-5" />
                </span>
                <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                  {totalParticipants > 1
                    ? t("waitingPlayersStart", { n: totalParticipants })
                    : t("waitingMoreParticipants")}
                </p>
                <Link
                  href="/ranking"
                  className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-arena)] hover:underline"
                >
                  {t("seeParticipants")} <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <ol className="space-y-2">
                {podium.map((p, i) => {
                  const display = p.nickname || p.email.split("@")[0];
                  const isMe = p.userId === me.id;
                  const position = i + 1;
                  const isLeader = position === 1;
                  const podiumTier = position <= 3;
                  return (
                    <li
                      key={p.userId}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 transition ${
                        isLeader
                          ? "border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_10%,var(--color-surface))] shadow-[var(--shadow-arena)]"
                          : isMe
                            ? "border-[var(--color-arena)]/45 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
                            : podiumTier
                              ? "border-[var(--color-border)] bg-[var(--color-surface-2)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    >
                      <Link
                        href={`/ranking/${p.userId}`}
                        aria-label={`Perfil de ${display}`}
                        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
                      />
                      <span
                        className={`relative grid size-9 shrink-0 place-items-center rounded-md font-display tabular text-xl leading-none ${
                          isLeader
                            ? "border border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_18%,transparent)] text-[var(--color-arena)] glow-arena"
                            : podiumTier
                              ? "border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-arena)]"
                              : "text-[var(--color-muted-foreground)]"
                        }`}
                      >
                        {isLeader ? <Crown className="size-4" /> : position}
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <p className="truncate font-display text-base leading-none tracking-tight">
                          {display}
                          {isMe ? (
                            <span className="ml-1.5 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
                              tú
                            </span>
                          ) : null}
                        </p>
                        {p.exactScoresCount > 0 || p.knockoutPoints > 0 ? (
                          <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                            {p.exactScoresCount > 0
                              ? t("podiumExact", { count: p.exactScoresCount })
                              : null}
                            {p.exactScoresCount > 0 && p.knockoutPoints > 0 ? " · " : ""}
                            {p.knockoutPoints > 0 ? `${p.knockoutPoints} KO` : null}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`relative font-display tabular leading-none ${
                          isLeader
                            ? "text-3xl text-[var(--color-arena)] glow-arena"
                            : "text-2xl"
                        }`}
                      >
                        {p.totalPoints}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          {myPosition != null && myPosition > 5 ? (
            <footer className="relative border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-4 py-2.5">
              <Link
                href={`/ranking/${me.id}`}
                className="flex items-center justify-between gap-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
              >
                <span>
                  Tu posición · <span className="font-display text-base text-[var(--color-arena)]">#{myPosition}</span>
                </span>
                <span className="flex items-center gap-1">
                  Ver mi tarjeta <ArrowRight className="size-3" />
                </span>
              </Link>
            </footer>
          ) : null}
        </div>
      </section>

      {/* Tablón de novedades de la app — patch notes que el admin va
          publicando (features, fixes, mejoras). Si no hay nada publicado
          el componente renderiza null y no añade ruido. */}
      <Suspense fallback={null}>
        <PatchNotesBoard />
      </Suspense>

      {/* Mundial al día — últimas 2 noticias, streamed para no bloquear
          el critical path del dashboard. */}
      <Suspense fallback={null}>
        <DashboardNewsStrip />
      </Suspense>
    </div>
  );
}

function Stat({
  label,
  value,
  prefix,
  hint,
  accent,
  href,
}: {
  label: string;
  value: string;
  prefix?: string | null;
  hint?: string;
  accent?: boolean;
  href?: string;
}) {
  const className = `group relative overflow-hidden rounded-xl border ${
    accent
      ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
      : "border-[var(--color-border)] bg-[var(--color-surface)]"
  } p-5 ${
    href
      ? "transition hover:-translate-y-0.5 hover:border-[var(--color-arena)]/70 hover:shadow-[var(--shadow-elev-2)]"
      : ""
  }`;
  const inner = (
    <>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        {prefix ? (
          <span className="font-display text-2xl text-[var(--color-muted-foreground)]">
            {prefix}
          </span>
        ) : null}
        <span
          className={`font-display tabular text-5xl tracking-tight ${
            accent ? "text-[var(--color-arena)] glow-arena" : ""
          }`}
        >
          {value}
        </span>
      </div>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
      {href ? (
        <span className="mt-2 flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-arena)] transition group-hover:translate-x-0.5">
          Ver mis resultados <ArrowRight className="size-3" />
        </span>
      ) : null}
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

function LiveTeam({
  team,
  align,
}: {
  team: { code: string; name: string; flagUrl: string | null } | null;
  align?: "start" | "end";
}) {
  const cls = align === "end" ? "flex-row-reverse text-right" : "";
  const Wrapper: React.ElementType = team ? Link : "div";
  const wrapperProps = team
    ? { href: `/equipos/${team.code}`, "aria-label": team.name }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`relative z-10 flex min-w-0 items-center gap-2.5 ${cls} ${
        team ? "transition hover:text-[var(--color-arena)]" : ""
      }`}
    >
      <TeamFlag code={team?.code} size={40} />
      <div className="min-w-0">
        <p className="truncate font-display text-lg leading-none tracking-tight sm:text-2xl">
          {team?.name ?? "TBD"}
        </p>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {team?.code ?? "—"}
        </p>
      </div>
    </Wrapper>
  );
}

function TeamCell({
  team,
  align,
}: {
  team: { code: string; name: string; flagUrl: string | null } | null;
  align: "start" | "end";
}) {
  const cls = align === "end" ? "flex-row-reverse text-right" : "";
  const Wrapper: React.ElementType = team ? Link : "div";
  const wrapperProps = team
    ? { href: `/equipos/${team.code}`, "aria-label": team.name }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`relative z-10 flex min-w-0 items-center gap-3 ${cls} ${
        team ? "pointer-events-auto transition hover:text-[var(--color-arena)]" : ""
      }`}
    >
      <TeamFlag code={team?.code} size={36} />
      <div className="min-w-0">
        <p className="truncate font-display text-lg leading-none">{team?.name ?? "TBD"}</p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {team?.code ?? "—"}
        </p>
      </div>
    </Wrapper>
  );
}

function TeamSide({
  team,
  align,
  isWinner,
  isLoser,
}: {
  team: { code: string; name: string; flagUrl: string | null } | null | undefined;
  align: "start" | "end";
  isWinner: boolean;
  isLoser: boolean;
}) {
  const flip = align === "end" ? "flex-row-reverse text-right" : "";
  const tone = isWinner
    ? "text-[var(--color-foreground)] font-semibold"
    : isLoser
      ? "text-[var(--color-muted-foreground)]"
      : "text-[var(--color-foreground)]";
  const Wrapper: React.ElementType = team ? Link : "div";
  const wrapperProps = team
    ? { href: `/equipos/${team.code}`, "aria-label": team.name }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`relative z-10 flex min-w-0 items-center gap-2 ${flip} ${
        team ? "pointer-events-auto transition hover:text-[var(--color-arena)]" : ""
      } ${tone}`}
    >
      <TeamFlag code={team?.code} size={22} />
      <span className="truncate font-display text-sm leading-none tracking-tight sm:text-base">
        {team?.name ?? "TBD"}
      </span>
    </Wrapper>
  );
}

function buildRunningHubProps({
  openMatchdays,
  bracket,
  bracketLabel,
  preTorneoComplete,
  preTorneoTotal,
  compact = false,
}: {
  openMatchdays: OpenMatchdayEntry[];
  compact?: boolean;
  bracket?: {
    state: "open" | "closed";
    closesAt: string | null;
    filled: number;
    total: number;
  };
  /** Etiqueta localizada para la deadline del bracket. */
  bracketLabel: string;
  preTorneoComplete: number;
  preTorneoTotal: number;
}): ProgressHubProps {
  // Pure data transformation. Las queries ya las hizo loadOpenMatchdays
  // (cacheada por React.cache, así que comparte resultado con el banner
  // del layout).
  type OpenMatchday = {
    id: number;
    label: string;
    closesAt: string;
    filled: number;
    total: number;
  };
  const openMatchdayItems: OpenMatchday[] = openMatchdays.map((m) => ({
    id: m.id,
    label: m.name,
    // El "next deadline" de una jornada con cierre por partido es el
    // próximo kickoff que todavía no llegó.
    closesAt: m.nextDeadlineAt.toISOString(),
    filled: m.filled,
    total: m.total,
  }));

  type Candidate = {
    kind: "matchday" | "bracket";
    label: string;
    href: string;
    closesAt: string;
    missing: number;
    total: number;
    closesAtMs: number;
  };
  const candidates: Candidate[] = [];
  // Recorremos las entradas crudas (no `openMatchdayItems`) para acceder a
  // `nextMissingAt`: en modo compacto (Marcador / Solo Ganador) la deadline
  // destacada es el kickoff del próximo partido SIN predecir, no el próximo
  // kickoff de la jornada.
  for (const m of openMatchdays) {
    if (compact) {
      // Solo jornadas con algún partido upcoming sin predecir.
      if (m.missing <= 0 || !m.nextMissingAt) continue;
      candidates.push({
        kind: "matchday",
        label: m.name,
        href: `/predicciones/jornada/${m.id}`,
        closesAt: m.nextMissingAt.toISOString(),
        missing: m.missing,
        total: m.total,
        closesAtMs: m.nextMissingAt.getTime(),
      });
      continue;
    }
    const missing = m.total - m.filled;
    if (missing > 0) {
      candidates.push({
        kind: "matchday",
        label: m.name,
        href: `/predicciones/jornada/${m.id}`,
        closesAt: m.nextDeadlineAt.toISOString(),
        missing,
        total: m.total,
        closesAtMs: m.nextDeadlineAt.getTime(),
      });
    }
  }
  if (bracket && bracket.state === "open" && bracket.closesAt) {
    const missing = bracket.total - bracket.filled;
    if (missing > 0) {
      candidates.push({
        kind: "bracket",
        label: bracketLabel,
        href: "/predicciones/bracket",
        closesAt: bracket.closesAt,
        missing,
        total: bracket.total,
        closesAtMs: new Date(bracket.closesAt).getTime(),
      });
    }
  }
  candidates.sort((a, b) => a.closesAtMs - b.closesAtMs);
  const nextDeadline = candidates[0] ?? null;

  return {
    phase: "running",
    nextDeadline: nextDeadline
      ? {
          kind: nextDeadline.kind,
          label: nextDeadline.label,
          href: nextDeadline.href,
          closesAt: nextDeadline.closesAt,
          missing: nextDeadline.missing,
          total: nextDeadline.total,
        }
      : null,
    openMatchdays: openMatchdayItems,
    bracket: bracket && bracket.state === "open" ? bracket : undefined,
    preTorneoComplete,
    preTorneoTotal,
    compact,
  };
}
