import Link from "next/link";
import { TeamFlag } from "@/components/brand/team-flag";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeTeams } from "@/lib/team-names";
import {
  groups,
  matchScorers,
  matches,
  players,
  pointsLedger,
  predMatchResult,
  predMatchScorer,
  profiles,
  teams,
} from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/brand/player-avatar";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { getCurrentUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { formatDateTime, initials } from "@/lib/utils";
import { intlLocale } from "@/lib/timezone";
import { LocalDateTime } from "@/components/local-date-time";
import { formatRemaining } from "@/lib/deadlines";
import { Edit3, MapPin, Newspaper, Settings2, Target } from "lucide-react";
import { BreadcrumbLD, MatchLD } from "@/components/seo/jsonld";
import { findVenueByMatchVenue } from "@/lib/seo/venues";
import { getNewsForMatch, listPublishedNews } from "@/lib/news/queries";
import { NewsCard } from "@/components/news/news-card";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const STAGE_KEY: Record<string, string> = {
  group: "stageGroup",
  r32: "stageR32",
  r16: "stageR16",
  qf: "stageQf",
  sf: "stageSf",
  third: "stageThird",
  final: "stageFinal",
};

function stageLabel(t: Translator, stage: string): string {
  const key = STAGE_KEY[stage];
  return key ? t(key) : stage;
}

const SOURCE_KEY: Record<string, string> = {
  match_exact_score: "srcExact",
  match_outcome: "srcOutcome",
  knockout_score_90: "src90",
  knockout_qualifier: "srcQualified",
  knockout_pens_bonus: "srcPens",
  match_scorer: "srcScorer",
  match_first_scorer: "srcFirstGoal",
};

function sourceLabel(t: Translator, source: string): string {
  const key = SOURCE_KEY[source];
  return key ? t(key) : source;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  const dateLocale = intlLocale(locale);
  const t = await getTranslations("matchDetail");
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) notFound();
  const teamIds = [match.homeTeamId, match.awayTeamId].filter(
    (x): x is number => x != null,
  );
  const allTeams =
    teamIds.length > 0
      ? await db.select().from(teams).where(inArray(teams.id, teamIds))
      : [];
  const lById = new Map(localizeTeams(allTeams, locale).map((t) => [t.id, t]));
  const home = match.homeTeamId ? lById.get(match.homeTeamId)?.name : null;
  const away = match.awayTeamId ? lById.get(match.awayTeamId)?.name : null;
  const stage = stageLabel(t, match.stage);
  const matchup =
    home && away ? `${home} vs ${away}` : t("matchupFallback", { code: match.code });
  const date = formatDateTime(match.scheduledAt, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    locale: dateLocale,
  });
  return {
    title: matchup,
    description: t("metaDescription", {
      matchup,
      stage,
      date,
      venue: match.venue ? t("metaVenueSuffix", { venue: match.venue }) : "",
    }),
    alternates: { canonical: `/partido/${match.id}` },
    openGraph: {
      title: t("ogTitle", { matchup, stage }),
      description: t("ogDescription", { matchup, stage }),
      url: `/partido/${match.id}`,
    },
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  const leagueId = me ? await currentLeagueId(me) : null;
  const locale = await getLocale();
  const t = await getTranslations("matchDetail");
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) notFound();

  const teamIds = [match.homeTeamId, match.awayTeamId].filter((x): x is number => x != null);
  const matchSourceKeyPrefix = `match:${matchId}:`;
  const [allTeams, scorerRows, myResultRows, myScorerRows, myLedgerRows] = await Promise.all([
    teamIds.length > 0
      ? db.select().from(teams).where(inArray(teams.id, teamIds))
      : Promise.resolve([]),
    db.select().from(matchScorers).where(eq(matchScorers.matchId, matchId)),
    me && leagueId != null
      ? db
          .select()
          .from(predMatchResult)
          .where(
            and(
              eq(predMatchResult.userId, me.id),
              eq(predMatchResult.leagueId, leagueId),
              eq(predMatchResult.matchId, matchId),
            ),
          )
          .limit(1)
      : Promise.resolve([] as Array<typeof predMatchResult.$inferSelect>),
    me && leagueId != null
      ? db
          .select()
          .from(predMatchScorer)
          .where(
            and(
              eq(predMatchScorer.userId, me.id),
              eq(predMatchScorer.leagueId, leagueId),
              eq(predMatchScorer.matchId, matchId),
            ),
          )
          .limit(1)
      : Promise.resolve([] as Array<typeof predMatchScorer.$inferSelect>),
    me && leagueId != null
      ? db
          .select()
          .from(pointsLedger)
          .where(
            and(
              eq(pointsLedger.userId, me.id),
              eq(pointsLedger.leagueId, leagueId),
              sql`${pointsLedger.sourceKey} like ${matchSourceKeyPrefix + "%"}`,
            ),
          )
      : Promise.resolve([] as Array<typeof pointsLedger.$inferSelect>),
  ]);
  const myResult = myResultRows[0] ?? null;
  const myScorer = myScorerRows[0] ?? null;

  // Predictions become public from kickoff (per visibility rules).
  const predsPublic = new Date(match.scheduledAt) <= new Date();

  const playerIds = scorerRows.map((s) => s.playerId);
  const [playerRows, resultPreds, scorerPreds, matchNews] = await Promise.all([
    playerIds.length > 0
      ? db.select().from(players).where(inArray(players.id, playerIds))
      : Promise.resolve([]),
    predsPublic && leagueId != null
      ? db
          .select({
            userId: predMatchResult.userId,
            homeScore: predMatchResult.homeScore,
            awayScore: predMatchResult.awayScore,
            willGoToPens: predMatchResult.willGoToPens,
            winnerTeamId: predMatchResult.winnerTeamId,
            authorEmail: profiles.email,
            authorNickname: profiles.nickname,
            authorAvatar: profiles.avatarUrl,
          })
          .from(predMatchResult)
          .innerJoin(profiles, eq(predMatchResult.userId, profiles.id))
          .where(
            and(
              eq(predMatchResult.matchId, matchId),
              eq(predMatchResult.leagueId, leagueId),
            ),
          )
      : Promise.resolve([]),
    predsPublic && leagueId != null
      ? db
          .select({
            userId: predMatchScorer.userId,
            playerId: predMatchScorer.playerId,
          })
          .from(predMatchScorer)
          .innerJoin(profiles, eq(predMatchScorer.userId, profiles.id))
          .where(
            and(
              eq(predMatchScorer.matchId, matchId),
              eq(predMatchScorer.leagueId, leagueId),
            ),
          )
      : Promise.resolve([]),
    // Noticias vinculadas al partido (relatedMatchId). Si no hay, caemos
    // a noticias de cualquiera de las dos selecciones — sigue siendo
    // relevante y nos da internal-linking adicional. Solo en ES (el resto
    // de idiomas no tiene sección de noticias).
    (async () => {
      if (locale !== "es") return [];
      const direct = await getNewsForMatch(matchId, 3);
      if (direct.length > 0) return direct;
      const teamCodes = allTeams.map((t) => t.code);
      if (teamCodes.length === 0) return [];
      const items = await Promise.all(
        teamCodes.map((c) => listPublishedNews({ teamCode: c, limit: 2 })),
      );
      const flat = items.flat();
      const seen = new Set<number>();
      const dedup: typeof flat = [];
      for (const it of flat) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        dedup.push(it);
        if (dedup.length === 3) break;
      }
      return dedup;
    })(),
  ]);

  // Player rows for the goalscorer predictions (mine + everyone's once revealed)
  const predScorerPlayerIds = (scorerPreds as { playerId: number }[]).map((p) => p.playerId);
  const myScorerIds = myScorer ? [myScorer.playerId] : [];
  const allRelevantPlayerIds = Array.from(
    new Set([...playerIds, ...predScorerPlayerIds, ...myScorerIds]),
  );
  const allPlayerRows =
    allRelevantPlayerIds.length > 0
      ? await db.select().from(players).where(inArray(players.id, allRelevantPlayerIds))
      : [];
  const playerById = new Map(allPlayerRows.map((p) => [p.id, p]));
  // Keep a backward-compat reference for the goleadores section using only the
  // scorer player rows so the rest of the page works unchanged.
  void playerRows;
  const dateLocale = intlLocale(locale);
  const teamById = new Map(localizeTeams(allTeams, locale).map((t) => [t.id, t]));

  const home = match.homeTeamId ? teamById.get(match.homeTeamId) : null;
  const away = match.awayTeamId ? teamById.get(match.awayTeamId) : null;

  // For fase de grupos matches, both teams share the same group; surface it
  // in the header so the user knows where the match sits.
  const groupId = match.stage === "group" ? home?.groupId ?? away?.groupId ?? null : null;
  const [matchGroup] =
    groupId != null
      ? await db.select().from(groups).where(eq(groups.id, groupId)).limit(1)
      : [];

  const sortedScorers = [...scorerRows].sort(
    (a, b) => (a.minute ?? 999) - (b.minute ?? 999),
  );

  const status =
    match.status === "finished"
      ? t("statusFinal")
      : match.status === "live"
        ? t("statusLive")
        : t("statusScheduled");

  // Combine result + scorer predictions per user
  type Combined = {
    userId: string;
    nickname: string | null;
    email: string;
    avatarUrl: string | null;
    homeScore: number | null;
    awayScore: number | null;
    willGoToPens: boolean;
    winnerTeamId: number | null;
    scorerPlayerId: number | null;
  };
  const byUser = new Map<string, Combined>();
  for (const r of resultPreds) {
    byUser.set(r.userId, {
      userId: r.userId,
      nickname: r.authorNickname,
      email: r.authorEmail ?? "",
      avatarUrl: r.authorAvatar,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      willGoToPens: r.willGoToPens,
      winnerTeamId: r.winnerTeamId ?? null,
      scorerPlayerId: null,
    });
  }
  for (const s of scorerPreds) {
    const existing = byUser.get(s.userId);
    if (existing) {
      existing.scorerPlayerId = s.playerId;
    } else {
      byUser.set(s.userId, {
        userId: s.userId,
        nickname: null,
        email: "",
        avatarUrl: null,
        homeScore: null,
        awayScore: null,
        willGoToPens: false,
        winnerTeamId: null,
        scorerPlayerId: s.playerId,
      });
    }
  }
  // Backfill missing identities for scorer-only rows
  if (scorerPreds.length > 0) {
    const missingIds = scorerPreds
      .map((s) => s.userId)
      .filter((id) => byUser.get(id)?.email === "");
    if (missingIds.length > 0) {
      const fill = await db
        .select()
        .from(profiles)
        .where(inArray(profiles.id, missingIds));
      for (const p of fill) {
        const existing = byUser.get(p.id);
        if (existing) {
          existing.email = p.email;
          existing.nickname = p.nickname;
          existing.avatarUrl = p.avatarUrl;
        }
      }
    }
  }
  const allCombined = Array.from(byUser.values()).sort((a, b) => {
    const an = (a.nickname || a.email).toLowerCase();
    const bn = (b.nickname || b.email).toLowerCase();
    return an.localeCompare(bn);
  });

  return (
    <div className="space-y-8">
      <BreadcrumbLD
        items={[
          { name: t("breadcrumbHome"), href: "/" },
          { name: t("breadcrumbCalendar"), href: "/calendario" },
          {
            name: home && away ? `${home.name} vs ${away.name}` : match.code,
            href: `/partido/${match.id}`,
          },
        ]}
      />
      <MatchLD
        match={{
          id: match.id,
          code: match.code,
          scheduledAt: match.scheduledAt,
          stage: match.stage,
          venue: match.venue ?? null,
          homeName: home?.name ?? null,
          awayName: away?.name ?? null,
        }}
        stageLabel={stageLabel(t, match.stage)}
      />
      <RealtimeRefresher
        channelKey={`partido:${matchId}`}
        subscriptions={[
          { table: "matches", filter: `id=eq.${matchId}` },
          { table: "match_scorers", filter: `match_id=eq.${matchId}` },
        ]}
      />
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
          <Link href="/calendario">
            <ArrowLeft />
            {t("back")}
          </Link>
        </Button>
        {me?.role === "admin" ? (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href={`/admin/partidos/${match.id}`}>
              <Settings2 className="size-3.5" />
              {t("editResult")}
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Hero scoreboard */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="spotlight absolute inset-0" aria-hidden />
        <div className="pitch-grid absolute inset-0 opacity-25" aria-hidden />

        <div className="relative space-y-6 p-6 sm:p-10">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="h-px w-8 bg-[var(--color-arena)]" />
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {stageLabel(t, match.stage)} · {match.code}
              </span>
              {matchGroup ? (
                <span className="rounded-sm border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
                  {t("group", { code: matchGroup.code })}
                </span>
              ) : null}
            </div>
            {match.status === "live" ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
                </span>
                {t("live")}
              </span>
            ) : (
              <Badge variant={match.status === "finished" ? "success" : "outline"}>
                {status}
              </Badge>
            )}
          </header>

          <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
            <TeamHero team={home} side="home" winner={match.winnerTeamId === home?.id} />
            <div className="flex flex-col items-center gap-2 text-center">
              {match.homeScore != null && match.awayScore != null ? (
                <span className="font-display tabular text-7xl leading-none tracking-tighter sm:text-9xl glow-arena">
                  {match.homeScore}
                  <span className="mx-2 text-[var(--color-muted-foreground)] opacity-60">·</span>
                  {match.awayScore}
                </span>
              ) : (
                <KickoffCountdown scheduledAt={match.scheduledAt} t={t} />
              )}
              {match.wentToPens ? (
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  {t("pens", {
                    home: match.homeScorePen ?? 0,
                    away: match.awayScorePen ?? 0,
                  })}
                </p>
              ) : null}
            </div>
            <TeamHero team={away} side="away" winner={match.winnerTeamId === away?.id} />
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            <span>
              <LocalDateTime
                iso={match.scheduledAt.toISOString()}
                ssr={formatDateTime(match.scheduledAt, { locale: dateLocale })}
              />
            </span>
            <VenueLink venue={match.venue} />
          </footer>
        </div>
      </section>

      {/* My pick — visible solo para usuarios autenticados; para visitantes
          mostramos un CTA invitando a crear su quiniela. */}
      {me ? (
        <MyPickPanel
          match={match}
          home={home ?? null}
          away={away ?? null}
          myResult={myResult}
          myScorerPlayer={myScorer ? playerById.get(myScorer.playerId) ?? null : null}
          myScorerGoalsInMatch={
            myScorer
              ? scorerRows.filter((s) => s.playerId === myScorer.playerId && !s.isOwnGoal).length
              : 0
          }
          myLedger={myLedgerRows}
          teamById={teamById}
          t={t}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("visitorCtaTitle")}</CardTitle>
            <CardDescription>{t("visitorCtaDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/login?next=%2Fpredicciones"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
            >
              {t("visitorCtaButton")}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Scorers timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{t("scorersTitle")}</CardTitle>
          <CardDescription>{t("scorersDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedScorers.length === 0 ? (
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("scorersEmpty")}
            </p>
          ) : (
            <ol className="relative space-y-3 border-l-2 border-dashed border-[var(--color-border)] pl-6">
              {sortedScorers.map((s) => {
                const p = playerById.get(s.playerId);
                const team = teamById.get(s.teamId);
                return (
                  <li key={s.id} className="relative">
                    <span
                      className={`absolute -left-[1.95rem] top-1 grid size-4 place-items-center rounded-full border-2 ${
                        s.isFirstGoal
                          ? "border-[var(--color-arena)] bg-[var(--color-arena)]"
                          : "border-[var(--color-border-strong)] bg-[var(--color-surface)]"
                      }`}
                    >
                      {s.isFirstGoal ? (
                        <span className="size-1 rounded-full bg-white" />
                      ) : null}
                    </span>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{team?.code ?? "?"}</Badge>
                        <span className="font-display text-base tracking-tight">
                          {p?.name ?? t("playerFallback")}
                        </span>
                        {s.isFirstGoal ? (
                          <Badge variant="default" className="text-[0.55rem]">
                            {t("firstGoalBadge")}
                          </Badge>
                        ) : null}
                        {s.isOwnGoal ? (
                          <Badge variant="danger" className="text-[0.55rem]">
                            {t("ownGoalBadge")}
                          </Badge>
                        ) : null}
                        {s.isPenalty ? (
                          <Badge variant="warning" className="text-[0.55rem]">
                            {t("penaltyBadge")}
                          </Badge>
                        ) : null}
                      </div>
                      {s.minute != null ? (
                        <span className="font-display tabular text-2xl text-[var(--color-muted-foreground)]">
                          {s.minute}
                          <span className="text-sm">′</span>
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Predictions reveal — visible solo para usuarios con sesión, ya que
          las predicciones son por liga y un visitante no tiene una. */}
      {me && predsPublic ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("predsTitle")}</CardTitle>
            <CardDescription>
              {t("predsDesc", { count: allCombined.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allCombined.length === 0 ? (
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                {t("predsEmpty")}
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                <div className="hidden grid-cols-[1fr_110px_1fr] items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:grid">
                  <span>{t("colParticipant")}</span>
                  <span className="text-center">{t("colResult")}</span>
                  <span>{t("colScorer")}</span>
                </div>
                <ul>
                  {allCombined.map((c) => {
                    const display = c.nickname || c.email.split("@")[0];
                    const player = c.scorerPlayerId ? playerById.get(c.scorerPlayerId) : null;
                    const playerScored =
                      player &&
                      sortedScorers.some((s) => s.playerId === player.id);
                    const exactScore =
                      match.homeScore != null &&
                      match.awayScore != null &&
                      c.homeScore === match.homeScore &&
                      c.awayScore === match.awayScore;
                    return (
                      <li
                        key={c.userId}
                        className={`flex flex-col gap-1.5 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 sm:grid sm:grid-cols-[1fr_110px_1fr] sm:items-center sm:gap-2 sm:py-2.5 ${
                          me && c.userId === me.id
                            ? "bg-[color-mix(in_oklch,var(--color-arena)_5%,transparent)]"
                            : ""
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Avatar className="size-7 border border-[var(--color-border)]">
                            {c.avatarUrl ? <AvatarImage src={c.avatarUrl} alt="" /> : null}
                            <AvatarFallback className="text-[0.6rem]">
                              {initials(display)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm font-medium">
                            {display}
                            {me && c.userId === me.id ? (
                              <span className="ml-1.5 font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-arena)]">
                                {t("you")}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span
                          className={`flex items-baseline gap-2 font-display tabular text-xl sm:justify-center ${
                            exactScore ? "text-[var(--color-success)] glow-pitch" : ""
                          }`}
                        >
                          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] sm:hidden">
                            {t("colResult")}
                          </span>
                          {c.homeScore != null && c.awayScore != null ? (
                            <>
                              {c.homeScore}
                              <span className="mx-1 opacity-60">·</span>
                              {c.awayScore}
                            </>
                          ) : (
                            <span className="text-[var(--color-muted-foreground)]">—</span>
                          )}
                          {c.willGoToPens ? (
                            <span className="font-mono text-[0.55rem] uppercase text-[var(--color-muted-foreground)]">
                              {t("pen")}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-2 truncate text-sm">
                          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] sm:hidden">
                            {t("colScorer")}
                          </span>
                          {player ? (
                            <>
                              <span
                                className={`size-1.5 rounded-full ${
                                  playerScored
                                    ? "bg-[var(--color-success)]"
                                    : "bg-[var(--color-muted-foreground)]"
                                }`}
                              />
                              <span className="truncate">{player.name}</span>
                            </>
                          ) : (
                            <span className="text-[var(--color-muted-foreground)]">—</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Noticias del partido (o de cualquiera de las dos selecciones).
          Solo se muestra en español. */}
      {locale === "es" && matchNews.length > 0 ? (
        <section className="space-y-5 border-t border-[var(--color-border)] pt-10">
          <header className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                <Newspaper className="size-3.5 text-[var(--color-arena)]" />
                {t("newsKicker")}
              </p>
              <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                {t("newsHeading")}
              </h2>
            </div>
          </header>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {matchNews.map((n) => (
              <li key={n.id}>
                <NewsCard {...n} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

    </div>
  );
}

const MARKER_SOURCES = new Set([
  "match_exact_score",
  "match_outcome",
  "knockout_score_90",
  "knockout_qualifier",
  "knockout_pens_bonus",
]);
const SCORER_SOURCES = new Set(["match_scorer", "match_first_scorer"]);

type LedgerEntry = typeof pointsLedger.$inferSelect;

function MyPickPanel({
  match,
  home,
  away,
  myResult,
  myScorerPlayer,
  myScorerGoalsInMatch,
  myLedger,
  teamById,
  t,
}: {
  match: typeof matches.$inferSelect;
  home: typeof teams.$inferSelect | null;
  away: typeof teams.$inferSelect | null;
  myResult: typeof predMatchResult.$inferSelect | null;
  myScorerPlayer: typeof players.$inferSelect | null;
  myScorerGoalsInMatch: number;
  myLedger: LedgerEntry[];
  teamById: Map<number, typeof teams.$inferSelect>;
  t: Translator;
}) {
  const open = new Date(match.scheduledAt).getTime() > Date.now();
  const finished = match.status === "finished";
  const hasPick = myResult != null || myScorerPlayer != null;

  const markerEntries = myLedger.filter((e) => MARKER_SOURCES.has(e.source));
  const scorerEntries = myLedger.filter((e) => SCORER_SOURCES.has(e.source));
  const markerPoints = markerEntries.reduce((s, e) => s + e.points, 0);
  const scorerPoints = scorerEntries.reduce((s, e) => s + e.points, 0);
  const totalPoints = markerPoints + scorerPoints;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{t("yourPick")}</CardTitle>
          <CardDescription>
            {hasPick
              ? open
                ? t("pickEditableOpen")
                : finished
                  ? t("pickFinished")
                  : t("pickLocked")
              : open
                ? t("pickNoneOpen")
                : t("pickNoneClosed")}
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {finished && hasPick ? <TotalEarned points={totalPoints} t={t} /> : null}
          {open && match.matchdayId != null ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/predicciones/jornada/${match.matchdayId}`}>
                <Edit3 className="size-3.5" />
                {hasPick ? t("edit") : t("predict")}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <ScoreboardPick
            home={home}
            away={away}
            homeScore={myResult?.homeScore ?? null}
            awayScore={myResult?.awayScore ?? null}
            willGoToPens={myResult?.willGoToPens ?? false}
            winnerName={
              myResult?.winnerTeamId
                ? teamById.get(myResult.winnerTeamId)?.name ?? null
                : null
            }
            winnerCorrect={
              finished &&
              myResult?.winnerTeamId != null &&
              match.winnerTeamId != null
                ? myResult.winnerTeamId === match.winnerTeamId
                : null
            }
            entries={markerEntries}
            totalPoints={markerPoints}
            finished={finished}
            hasPrediction={myResult != null}
            t={t}
          />
          <ScorerPick
            player={myScorerPlayer}
            team={myScorerPlayer ? teamById.get(myScorerPlayer.teamId) ?? null : null}
            goalsScored={myScorerGoalsInMatch}
            entries={scorerEntries}
            totalPoints={scorerPoints}
            finished={finished}
            t={t}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TotalEarned({ points, t }: { points: number; t: Translator }) {
  const positive = points > 0;
  return (
    <div
      className={`flex items-baseline gap-1 rounded-md border px-2.5 py-1.5 font-display tabular leading-none ${
        positive
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)] glow-arena"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
      }`}
      title={t("totalEarnedTitle")}
    >
      {positive ? <span className="text-xs opacity-70">+</span> : null}
      <span className="text-xl">{points}</span>
      <span className="text-[0.55rem] uppercase tracking-[0.18em] opacity-70">
        {points === 1 ? t("pt") : t("pts")}
      </span>
    </div>
  );
}

function ScoreboardPick({
  home,
  away,
  homeScore,
  awayScore,
  willGoToPens,
  winnerName,
  winnerCorrect,
  entries,
  totalPoints,
  finished,
  hasPrediction,
  t,
}: {
  home: typeof teams.$inferSelect | null;
  away: typeof teams.$inferSelect | null;
  homeScore: number | null;
  awayScore: number | null;
  willGoToPens: boolean;
  winnerName: string | null;
  winnerCorrect: boolean | null;
  entries: LedgerEntry[];
  totalPoints: number;
  finished: boolean;
  hasPrediction: boolean;
  t: Translator;
}) {
  const noPick = homeScore == null || awayScore == null;
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("scoreboardLabel")}
        </p>
        {finished && hasPrediction ? (
          <PointsTag points={totalPoints} t={t} />
        ) : null}
      </div>
      {noPick ? (
        <p className="font-display tabular text-2xl tracking-tight text-[var(--color-muted-foreground)]">
          {t("noPick")}
        </p>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
          <ScoreboardSide team={home} align="end" t={t} />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Digit value={homeScore} />
            <span className="font-display text-2xl text-[var(--color-muted-foreground)]">
              –
            </span>
            <Digit value={awayScore} />
          </div>
          <ScoreboardSide team={away} align="start" t={t} />
        </div>
      )}
      {willGoToPens ? (
        <p className="text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          {t("plusPens")}
        </p>
      ) : null}
      {winnerName ? (
        <p className="border-t border-dashed border-[var(--color-border)] pt-2 text-center text-[0.7rem] text-[var(--color-muted-foreground)]">
          {t.rich("qualified", {
            name: winnerName,
            b: (chunks) => (
              <span className="font-medium text-[var(--color-foreground)]">{chunks}</span>
            ),
          })}
          {winnerCorrect === true ? " ✓" : winnerCorrect === false ? " ✗" : ""}
        </p>
      ) : null}
      {finished && hasPrediction ? (
        <PointsBreakdown entries={entries} emptyLabel={t("noMarkerPoints")} t={t} />
      ) : null}
    </div>
  );
}

function Digit({ value }: { value: number }) {
  return (
    <span className="grid h-14 min-w-[3rem] place-items-center rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] px-2 font-display tabular text-5xl leading-none tracking-tight text-[var(--color-arena)] glow-arena sm:h-16 sm:min-w-[3.5rem] sm:text-6xl">
      {value}
    </span>
  );
}

function ScoreboardSide({
  team,
  align,
  t,
}: {
  team: typeof teams.$inferSelect | null;
  align: "start" | "end";
  t: Translator;
}) {
  const cls =
    align === "end" ? "items-end text-right" : "items-start text-left";
  const Wrapper: React.ElementType = team ? Link : "div";
  const wrapperProps = team
    ? { href: `/equipos/${team.code}`, "aria-label": team.name }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`flex min-w-0 flex-col gap-1 ${cls} ${
        team ? "transition hover:text-[var(--color-arena)]" : ""
      }`}
    >
      <TeamFlag code={team?.code} size={28} />
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {team?.code ?? "—"}
      </p>
      <p className="truncate font-display text-sm leading-tight">{team?.name ?? t("tbd")}</p>
    </Wrapper>
  );
}

function ScorerPick({
  player,
  team,
  goalsScored,
  entries,
  totalPoints,
  finished,
  t,
}: {
  player: typeof players.$inferSelect | null;
  team: typeof teams.$inferSelect | null;
  goalsScored: number;
  entries: LedgerEntry[];
  totalPoints: number;
  finished: boolean;
  t: Translator;
}) {
  const hit = goalsScored > 0;
  return (
    <div
      className={`relative space-y-4 overflow-hidden rounded-xl border p-4 ${
        hit
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface-2))]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
      }`}
    >
      {hit ? (
        <>
          <div
            aria-hidden
            className="halftone pointer-events-none absolute inset-x-0 top-0 h-20 opacity-[0.06]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 32%, transparent), transparent 70%)",
            }}
          />
        </>
      ) : null}

      <div className="relative flex items-baseline justify-between gap-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("scorerLabel")}
        </p>
        {finished && player ? <PointsTag points={totalPoints} t={t} /> : null}
      </div>

      {player ? (
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photoUrl}
              jerseyNumber={player.jerseyNumber}
              size={64}
              className={hit ? "border-[var(--color-arena)]/50" : ""}
            />
            {team ? (
              <Link
                href={`/equipos/${team.code}`}
                aria-label={team.name}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-[var(--color-surface-2)] bg-[var(--color-surface)] shadow-[var(--shadow-elev-1)] transition hover:scale-110"
              >
                <TeamFlag code={team.code} size={22} />
              </Link>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate font-display text-xl leading-tight tracking-tight sm:text-2xl ${
                hit ? "text-[var(--color-arena)] glow-arena" : ""
              }`}
            >
              {player.name}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {player.jerseyNumber != null ? (
                <span className="font-display tabular text-[0.75rem] text-[var(--color-foreground)]">
                  #{player.jerseyNumber}
                </span>
              ) : null}
              {team ? <span>{team.code}</span> : null}
              {player.position ? <span>· {player.position}</span> : null}
            </p>
            {hit ? (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                <Target className="size-2.5" />
                {t("scoredGoals", { count: goalsScored })}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-3 py-1">
          <span
            className="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
          >
            <Target className="size-6" />
          </span>
          <div>
            <p className="font-display text-xl leading-tight tracking-tight text-[var(--color-muted-foreground)]">
              {t("noPick")}
            </p>
            <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {t("noScorerPick")}
            </p>
          </div>
        </div>
      )}

      {finished && player ? (
        <div className="relative">
          <PointsBreakdown entries={entries} emptyLabel={t("noGoalNoPoints")} t={t} />
        </div>
      ) : null}
    </div>
  );
}

function PointsTag({ points, t }: { points: number; t: Translator }) {
  const positive = points > 0;
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded font-display tabular leading-none ${
        positive
          ? "bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] px-1.5 py-1 text-base text-[var(--color-arena)]"
          : "bg-transparent px-0 py-0 text-sm text-[var(--color-muted-foreground)]"
      }`}
    >
      {positive ? <span className="text-xs opacity-70">+</span> : null}
      <span>{points}</span>
      <span className="text-[0.55rem] uppercase tracking-[0.18em] opacity-70">
        {points === 1 ? t("pt") : t("pts")}
      </span>
    </span>
  );
}

function PointsBreakdown({
  entries,
  emptyLabel,
  t,
}: {
  entries: LedgerEntry[];
  emptyLabel: string;
  t: Translator;
}) {
  if (entries.length === 0) {
    return (
      <p className="border-t border-dashed border-[var(--color-border)] pt-2 text-[0.7rem] italic text-[var(--color-muted-foreground)]">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-1 border-t border-dashed border-[var(--color-border)] pt-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-baseline justify-between gap-2 text-[0.7rem]"
        >
          <span className="text-[var(--color-foreground)]">
            {sourceLabel(t, e.source)}
          </span>
          <span className="font-display tabular text-sm text-[var(--color-arena)]">
            +{e.points}
          </span>
        </li>
      ))}
    </ul>
  );
}

function KickoffCountdown({
  scheduledAt,
  t,
}: {
  scheduledAt: Date | string;
  t: Translator;
}) {
  const ms = new Date(scheduledAt).getTime() - Date.now();
  if (ms <= 0) {
    return (
      <span className="font-display text-6xl text-[var(--color-muted-foreground)]">
        {t("vs")}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {t("startsIn")}
      </span>
      <span className="font-display tabular text-5xl leading-none tracking-tighter text-[var(--color-arena)] glow-arena sm:text-7xl">
        {formatRemaining(ms)}
      </span>
    </div>
  );
}

function VenueLink({ venue }: { venue: string | null }) {
  if (!venue) return null;
  // matches.venue se guarda como "Estadio · Ciudad". Si encontramos la
  // sede en el catálogo SEO, linkeamos a /sedes/[slug]. Si no, dejamos
  // texto plano para no enviar al usuario a un 404.
  const resolved = findVenueByMatchVenue(venue);
  if (!resolved) {
    return <span className="truncate">{venue}</span>;
  }
  return (
    <Link
      href={`/sedes/${resolved.slug}`}
      className="group inline-flex max-w-full items-center gap-1.5 truncate not-italic font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
    >
      <MapPin className="size-3.5 shrink-0" />
      <span className="truncate">{venue}</span>
    </Link>
  );
}

function TeamHero({
  team,
  side,
  winner,
}: {
  team: { name: string; code: string; flagUrl: string | null } | null | undefined;
  side: "home" | "away";
  winner: boolean;
}) {
  const Wrapper: React.ElementType = team ? Link : "div";
  const wrapperProps = team
    ? { href: `/equipos/${team.code}`, "aria-label": team.name }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`flex flex-col items-center gap-3 text-center ${
        side === "home" ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left"
      } ${team ? "group transition hover:text-[var(--color-arena)]" : ""}`}
    >
      <TeamFlag
        code={team?.code}
        size={80}
        className={
          winner
            ? "ring-2 ring-[var(--color-arena)] shadow-[var(--shadow-arena)] transition group-hover:scale-105"
            : "ring-1 ring-[var(--color-border-strong)] transition group-hover:scale-105"
        }
      />
      <div>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {team?.code ?? "—"}
        </p>
        <p
          className={`font-display text-3xl tracking-tight sm:text-4xl ${
            winner ? "text-[var(--color-arena)]" : ""
          }`}
        >
          {team?.name ?? "TBD"}
        </p>
      </div>
    </Wrapper>
  );
}
