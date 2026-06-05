import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Crown, Goal, MapPin, Newspaper, Shirt, Target, Users } from "lucide-react";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { localizeTeams, localizedTeamName } from "@/lib/team-names";
import { localizedStageLabel } from "@/lib/matchday-names";
import {
  groupStandings,
  groups,
  matchScorers,
  matches,
  players,
  predGroupRanking,
  teams,
} from "@/lib/db/schema";
import { TeamFlag } from "@/components/brand/team-flag";
import { PlayerAvatar } from "@/components/brand/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/empty-state";
import { formatDateTime } from "@/lib/utils";
import { POSITIONS, POSITION_LABEL, type Position, normalizePosition } from "@/lib/position";
import { BreadcrumbLD, SportsTeamLD } from "@/components/seo/jsonld";
import { TEAM_ANALYSES } from "@/lib/seo/team-analysis";
import { getNewsForTeam } from "@/lib/news/queries";
import { NewsCard } from "@/components/news/news-card";
import { getCurrentUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "Tercer puesto",
  final: "Final",
};

const POSITION_STYLE: Record<Position, { tone: string }> = {
  POR: { tone: "var(--color-warning)" },
  DEF: { tone: "var(--color-pitch)" },
  MED: { tone: "var(--color-accent)" },
  DEL: { tone: "var(--color-arena)" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const [team] = await db.select().from(teams).where(eq(teams.code, upper)).limit(1);
  if (!team) notFound();
  const analysis = TEAM_ANALYSES[upper];
  const description = analysis
    ? `${analysis.intro} Calendario, plantilla por posición, goleadores y análisis de ${team.name} en el Mundial 2026.`
    : `${team.name} en el Mundial 2026: grupo, calendario de partidos, plantilla y goleadores.`;
  return {
    title: team.name,
    description,
    alternates: { canonical: `/equipos/${upper}` },
    openGraph: {
      title: `${team.name} · Mundial 2026`,
      description: analysis
        ? `${analysis.intro.slice(0, 160)}…`
        : `Calendario y plantilla de ${team.name} en el Mundial 2026.`,
      url: `/equipos/${upper}`,
    },
  };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("teamDetail");
  const me = await getCurrentUser();
  const leagueId = me ? await currentLeagueId(me) : null;
  const { code } = await params;
  const upper = code.toUpperCase();
  const [team] = await db.select().from(teams).where(eq(teams.code, upper)).limit(1);
  if (!team) notFound();

  const [group] = team.groupId
    ? await db.select().from(groups).where(eq(groups.id, team.groupId)).limit(1)
    : [];

  const [teamMatches, squad, standingRows, scorerAggRows, teamNews] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(or(eq(matches.homeTeamId, team.id), eq(matches.awayTeamId, team.id)))
      .orderBy(asc(matches.scheduledAt)),
    db
      .select()
      .from(players)
      .where(eq(players.teamId, team.id))
      .orderBy(asc(players.jerseyNumber)),
    team.groupId
      ? db
          .select()
          .from(groupStandings)
          .where(and(eq(groupStandings.teamId, team.id), eq(groupStandings.groupId, team.groupId)))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        playerId: matchScorers.playerId,
        goals: sql<number>`count(*)::int`,
      })
      .from(matchScorers)
      .where(and(eq(matchScorers.teamId, team.id), sql`${matchScorers.isOwnGoal} = false`))
      .groupBy(matchScorers.playerId)
      .orderBy(sql`count(*) desc`),
    getNewsForTeam(team.code, 3),
  ]);

  const standing = standingRows[0];
  const playerById = new Map(squad.map((p) => [p.id, p]));
  const goalsByPlayer = new Map(scorerAggRows.map((r) => [r.playerId, r.goals]));
  const teamGoals = scorerAggRows.reduce((s, r) => s + r.goals, 0);
  const topScorerId = scorerAggRows[0]?.playerId ?? null;

  // Rivales para tarjetas de partido.
  const oppIds = Array.from(
    new Set(
      teamMatches
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
        .filter((x): x is number => x != null && x !== team.id),
    ),
  );
  const oppRows = oppIds.length > 0
    ? await db.select().from(teams).where(inArray(teams.id, oppIds))
    : [];
  const oppById = new Map(localizeTeams(oppRows, locale).map((t) => [t.id, t]));

  // Predicción agregada de la peña: en qué posición del grupo se coloca a este equipo.
  // Sólo se calcula con sesión activa, liga seleccionada y primer partido del grupo ya jugado.
  let aggPositions: { pos: number; count: number; pct: number }[] = [];
  let aggTotalUsers = 0;
  if (me && leagueId != null && team.groupId != null) {
    const firstMatchInGroup = teamMatches.find((m) => m.stage === "group");
    const ranksPublic = firstMatchInGroup
      ? new Date(firstMatchInGroup.scheduledAt).getTime() <= Date.now()
      : false;
    if (ranksPublic) {
      const rankRows = await db
        .select({
          pos1: predGroupRanking.pos1TeamId,
          pos2: predGroupRanking.pos2TeamId,
          pos3: predGroupRanking.pos3TeamId,
          pos4: predGroupRanking.pos4TeamId,
        })
        .from(predGroupRanking)
        .where(
          and(
            eq(predGroupRanking.groupId, team.groupId),
            eq(predGroupRanking.leagueId, leagueId),
          ),
        );
      aggTotalUsers = rankRows.length;
      const counts = [0, 0, 0, 0];
      for (const r of rankRows) {
        if (r.pos1 === team.id) counts[0]++;
        else if (r.pos2 === team.id) counts[1]++;
        else if (r.pos3 === team.id) counts[2]++;
        else if (r.pos4 === team.id) counts[3]++;
      }
      if (aggTotalUsers > 0) {
        aggPositions = counts.map((c, i) => ({
          pos: i + 1,
          count: c,
          pct: Math.round((c / aggTotalUsers) * 100),
        }));
      }
    }
  }

  // Particionar partidos: próximo (más cercano sin terminar), resultados (finished desc),
  // calendario restante (scheduled - próximo).
  const now = Date.now();
  const finishedDesc = [...teamMatches]
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  const upcoming = teamMatches.filter((m) => m.status !== "finished");
  const liveMatch = upcoming.find((m) => m.status === "live");
  const nextMatch =
    liveMatch ??
    upcoming
      .filter((m) => new Date(m.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ??
    upcoming[0] ??
    null;
  const remainingUpcoming = upcoming.filter((m) => m.id !== nextMatch?.id);

  // Agrupar plantilla por posición canónica.
  const squadByPosition: Record<Position, typeof squad> = {
    POR: [],
    DEF: [],
    MED: [],
    DEL: [],
  };
  const squadOther: typeof squad = [];
  for (const p of squad) {
    const norm = p.position ? normalizePosition(p.position) : null;
    if (norm) squadByPosition[norm].push(p);
    else squadOther.push(p);
  }

  const analysis = TEAM_ANALYSES[upper];
  const matchesPlayed = standing?.played ?? 0;
  const totalMatches = teamMatches.length;
  const goalsFor = standing?.goalsFor ?? 0;
  const goalsAgainst = standing?.goalsAgainst ?? 0;
  const goalDiff = goalsFor - goalsAgainst;

  // Nombre del propio equipo localizado para todo el body (hero, cards).
  team.name = localizedTeamName(team.code, team.name, locale);

  const cardLabels = {
    stageLocale: locale,
    vs: t("vs"),
    tbd: t("tbd"),
    live: t("statusLive"),
    scheduled: t("statusScheduled"),
    win: t("resultWin"),
    loss: t("resultLoss"),
    draw: t("resultDraw"),
  };

  return (
    <div className="space-y-8">
      <SportsTeamLD
        name={team.name}
        code={team.code}
        groupName={group?.name ?? null}
        squadSize={squad.length}
        href={`/equipos/${team.code}`}
      />
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Selecciones", href: "/equipos" },
          { name: team.name, href: `/equipos/${team.code}` },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/equipos">
          <ArrowLeft />
          {t("backToTeams")}
        </Link>
      </Button>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-x-0 top-0 h-40 opacity-[0.05]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 28%, transparent), transparent 70%)",
          }}
        />
        <div className="relative grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-8">
          <div className="shrink-0 self-center">
            <span className="block sm:hidden">
              <TeamFlag code={team.code} size={120} />
            </span>
            <span className="hidden sm:block">
              <TeamFlag code={team.code} size={192} />
            </span>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {t("teamEyebrow", { code: team.code })}
              </p>
              <h1 className="font-display text-5xl leading-[0.92] tracking-tight sm:text-7xl">
                {team.name}
              </h1>
              {group ? (
                <p className="font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
                  {t("inGroup", { team: team.name })}{" "}
                  <Link
                    href={`/grupos/${group.code}`}
                    className="text-[var(--color-arena)] underline-offset-2 hover:underline"
                  >
                    {t("groupLink", { code: group.code })}
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            {/* Stats clave */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label={t("statPosition")}
                value={standing ? `${standing.position}º` : "—"}
                hint={standing ? t("statPositionHint", { points: standing.points }) : t("statNotPlayed")}
              />
              <Stat
                label={t("statMatches")}
                value={`${matchesPlayed} / ${totalMatches || 3}`}
                hint={liveMatch ? t("oneLive") : null}
                live={!!liveMatch}
              />
              <Stat
                label={t("statGoals")}
                value={`${goalsFor}`}
                hint={
                  goalDiff !== 0
                    ? `${goalDiff > 0 ? "+" : ""}${goalDiff} DG`
                    : standing
                      ? "DG 0"
                      : null
                }
              />
              <Stat
                label={t("statSquad")}
                value={squad.length.toString()}
                hint={t("forwards", { count: squadByPosition.DEL.length })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Análisis editorial (SEO) ─── */}
      {analysis ? (
        <section className="space-y-4">
          <SectionHeader title={t("analysisTitle")} />
          <article className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
            <p className="font-editorial text-base italic leading-relaxed text-[var(--color-foreground)] sm:text-lg">
              {analysis.intro}
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              <AnalysisColumn label={t("analysisStar")} title={analysis.star.title} text={analysis.star.text} />
              <AnalysisColumn label={t("analysisStrengths")} title={analysis.strengths.title} text={analysis.strengths.text} />
              <AnalysisColumn label={t("analysisRisks")} title={analysis.risks.title} text={analysis.risks.text} />
            </div>
            <div className="rounded-md border-l-2 border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface-2))] px-4 py-3">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
                {t("tournamentExpectation")}
              </p>
              <p className="pt-1 text-sm leading-relaxed">{analysis.expectation}</p>
            </div>
          </article>
        </section>
      ) : null}

      {/* ─── Próximo partido ─── */}
      {nextMatch ? (
        <section className="space-y-4">
          <SectionHeader title={liveMatch ? t("liveMatch") : t("nextMatch")} icon={Clock} />
          <NextMatchCard
            m={nextMatch}
            team={team}
            opp={
              nextMatch.homeTeamId === team.id
                ? nextMatch.awayTeamId
                  ? oppById.get(nextMatch.awayTeamId) ?? null
                  : null
                : nextMatch.homeTeamId
                  ? oppById.get(nextMatch.homeTeamId) ?? null
                  : null
            }
            labels={cardLabels}
          />
        </section>
      ) : null}

      {/* ─── Resultados recientes ─── */}
      {finishedDesc.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title={t("results")} icon={CalendarDays} />
          <div className="grid gap-3 sm:grid-cols-2">
            {finishedDesc.map((m) => {
              const isHome = m.homeTeamId === team.id;
              const oppId = isHome ? m.awayTeamId : m.homeTeamId;
              const opp = oppId ? oppById.get(oppId) ?? null : null;
              return <ResultCard key={m.id} m={m} team={team} opp={opp} isHome={isHome} labels={cardLabels} />;
            })}
          </div>
        </section>
      ) : null}

      {/* ─── Calendario restante ─── */}
      {remainingUpcoming.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title={t("schedule")} icon={CalendarDays} />
          <ul className="space-y-2">
            {remainingUpcoming.map((m) => {
              const isHome = m.homeTeamId === team.id;
              const oppId = isHome ? m.awayTeamId : m.homeTeamId;
              const opp = oppId ? oppById.get(oppId) ?? null : null;
              return <UpcomingRow key={m.id} m={m} opp={opp} labels={cardLabels} />;
            })}
          </ul>
        </section>
      ) : null}

      {teamMatches.length === 0 ? (
        <section className="space-y-4">
          <SectionHeader title={t("schedule")} icon={CalendarDays} />
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title={t("noMatchesTitle")}
            description={t("noMatchesDesc")}
          />
        </section>
      ) : null}

      {/* ─── Goleadores del equipo ─── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("scorers")}
          </h2>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          {teamGoals > 0 ? (
            <span className="shrink-0 rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] px-2.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
              {t("goalsCount", { count: teamGoals })}
            </span>
          ) : null}
        </div>
        {scorerAggRows.length === 0 ? (
          <EmptyState
            icon={<Target className="size-5" />}
            title={t("noGoalsTitle")}
            description={t("noGoalsDesc")}
          />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {scorerAggRows.slice(0, 8).map((r, i) => {
              const player = playerById.get(r.playerId);
              const isTop = i === 0;
              return (
                <li
                  key={r.playerId}
                  className={`flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 ${
                    isTop ? "bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]" : ""
                  }`}
                >
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`font-display tabular text-2xl ${
                        isTop
                          ? "text-[var(--color-arena)] glow-arena"
                          : "text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    {isTop ? <Crown className="size-3.5 text-[var(--color-arena)]" /> : null}
                  </span>
                  <PlayerAvatar
                    name={player?.name}
                    photoUrl={player?.photoUrl}
                    jerseyNumber={player?.jerseyNumber}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base tracking-tight">
                      {player?.name ?? "—"}
                    </p>
                    <p className="truncate font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {player?.position ?? "—"}
                      {player?.jerseyNumber != null ? ` · #${player.jerseyNumber}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-display tabular text-3xl tracking-tight ${
                      isTop ? "text-[var(--color-arena)] glow-arena" : ""
                    }`}
                  >
                    {r.goals}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── Plantilla por posición ─── */}
      <section className="space-y-6">
        <SectionHeader title={t("squadTitle", { count: squad.length })} icon={Users} />
        {squad.length === 0 ? (
          <EmptyState
            icon={<Shirt className="size-5" />}
            title={t("noSquadTitle")}
            description={t("noSquadDesc")}
          />
        ) : (
          <div className="space-y-10">
            {POSITIONS.map((pos) => {
              const list = squadByPosition[pos]
                .slice()
                .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99));
              if (list.length === 0) return null;
              const style = POSITION_STYLE[pos];
              return (
                <div key={pos} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.28em]"
                      style={{
                        borderColor: `color-mix(in oklch, ${style.tone} 40%, transparent)`,
                        background: `color-mix(in oklch, ${style.tone} 8%, transparent)`,
                        color: style.tone,
                      }}
                    >
                      <span
                        aria-hidden
                        className="inline-block size-1.5 rounded-full"
                        style={{ background: style.tone }}
                      />
                      {pos} · {POSITION_LABEL[pos]}
                    </span>
                    <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {t("playersCount", { count: list.length })}
                    </span>
                    <span className="h-px flex-1 bg-[var(--color-border)]" />
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((p) => {
                      const g = goalsByPlayer.get(p.id) ?? 0;
                      return (
                        <PlayerCard
                          key={p.id}
                          player={p}
                          goals={g}
                          isTopScorer={p.id === topScorerId}
                          topScorerLabel={t("topScorerLabel")}
                          goalsTitle={t("playerGoalsTitle", { count: g })}
                        />
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {squadOther.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                    {t("other")}
                  </span>
                  <span className="h-px flex-1 bg-[var(--color-border)]" />
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {squadOther.map((p) => {
                    const g = goalsByPlayer.get(p.id) ?? 0;
                    return (
                      <PlayerCard
                        key={p.id}
                        player={p}
                        goals={g}
                        isTopScorer={p.id === topScorerId}
                        topScorerLabel={t("topScorerLabel")}
                        goalsTitle={t("playerGoalsTitle", { count: g })}
                      />
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ─── Predicción agregada / CTA visitante ─── */}
      {me ? (
        aggTotalUsers > 0 ? (
          <section className="space-y-3">
            <SectionHeader title={t("leagueAggTitle")} />
            <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
              <p className="pb-4 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                {t("leagueAggIntro", {
                  count: aggTotalUsers,
                  team: team.name,
                  code: group?.code ?? "",
                })}
              </p>
              <ul className="space-y-2">
                {aggPositions.map((row) => {
                  const advances = row.pos <= 2;
                  const limbo = row.pos === 3;
                  const color = advances
                    ? "var(--color-arena)"
                    : limbo
                      ? "var(--color-warning)"
                      : "var(--color-muted-foreground)";
                  return (
                    <li key={row.pos} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        <span>
                          <span className="font-display tabular text-sm" style={{ color }}>
                            {row.pos}º
                          </span>{" "}
                          {advances ? t("passToR32") : limbo ? t("best3rd") : t("out")}
                        </span>
                        <span className="text-[var(--color-foreground)]">
                          {row.pct}% · {row.count}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.pct}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          </section>
        ) : null
      ) : null}

      {/* Noticias de la selección — vínculo bidireccional con /noticias.
          Si no hay artículos vinculados a este team, no renderizamos. */}
      {teamNews.length > 0 ? (
        <section className="space-y-5 border-t border-[var(--color-border)] pt-10">
          <header className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                <Newspaper className="size-3.5 text-[var(--color-arena)]" />
                {t("newsEyebrow", { team: team.name })}
              </p>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                {t("newsTitle", { team: team.name })}
              </h2>
            </div>
            <Link
              href={`/noticias?team=${team.code}`}
              className="hidden items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)] sm:inline-flex"
            >
              {t("seeMore")}
            </Link>
          </header>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teamNews.map((n) => (
              <li key={n.id}>
                <NewsCard {...n} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!me ? (
        <section className="rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6 text-center">
          <p className="font-display text-2xl tracking-tight">{t("visitorTitle", { team: team.name })}</p>
          <p className="pt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("visitorSubtitle")}
          </p>
          <Link
            href="/login?next=%2Fpredicciones%2Fgrupos"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            {t("createMyQuiniela")}
          </Link>
        </section>
      ) : null}
    </div>
  );
}

// ──────────────────────── Helpers ────────────────────────

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-6 bg-[var(--color-arena)]" />
      {Icon ? <Icon className="size-3.5 text-[var(--color-arena)]" /> : null}
      <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {title}
      </h2>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  live,
}: {
  label: string;
  value: string;
  hint?: string | null;
  live?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-0.5 font-display tabular text-2xl tracking-tight ${
          live ? "text-[var(--color-arena)] glow-arena" : "text-[var(--color-foreground)]"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function AnalysisColumn({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
        {label}
      </p>
      <p className="font-display text-lg tracking-tight">{title}</p>
      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">{text}</p>
    </div>
  );
}

// ──────────────────────── Match cards ────────────────────────

type MatchRow = typeof matches.$inferSelect;
type TeamRow = typeof teams.$inferSelect;

type CardLabels = {
  stageLocale: string;
  vs: string;
  tbd: string;
  live: string;
  scheduled: string;
  win: string;
  loss: string;
  draw: string;
};

function NextMatchCard({
  m,
  team,
  opp,
  labels,
}: {
  m: MatchRow;
  team: TeamRow;
  opp: TeamRow | null;
  labels: CardLabels;
}) {
  const isHome = m.homeTeamId === team.id;
  const isLive = m.status === "live";
  return (
    <Link
      href={`/partido/${m.id}`}
      aria-label={`Partido ${m.code}`}
      className="group relative block overflow-hidden rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] transition-all hover:-translate-y-0.5 hover:border-[var(--color-arena)]/60 hover:shadow-[var(--shadow-elev-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
    >
      <div
        aria-hidden
        className="halftone pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.06]"
      />
      <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-5 py-2.5">
        <span className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          <span>{m.code}</span>
          <Badge variant="outline" className="text-[0.55rem]">
            {localizedStageLabel(m.stage, STAGE_LABEL[m.stage] ?? m.stage, labels.stageLocale)}
          </Badge>
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
            <span className="relative flex size-1.5">
              <span
                aria-hidden
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
              />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-arena)]" />
            </span>
            {labels.live}
          </span>
        ) : (
          <Badge variant="outline" className="text-[0.55rem]">
            {labels.scheduled}
          </Badge>
        )}
      </header>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-6 sm:gap-6 sm:py-8">
        <TeamSide team={isHome ? team : opp} side="home" labels={labels} />
        <ScoreCenter
          home={isHome ? m.homeScore : m.awayScore}
          away={isHome ? m.awayScore : m.homeScore}
          status={m.status}
          scheduledAt={m.scheduledAt}
          big
          labels={labels}
        />
        <TeamSide team={isHome ? opp : team} side="away" labels={labels} />
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/30 px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3 shrink-0" />
          {formatDateTime(m.scheduledAt, {
            weekday: "long",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {m.venue ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{m.venue}</span>
          </span>
        ) : null}
      </footer>
    </Link>
  );
}

function ResultCard({
  m,
  team,
  opp,
  isHome,
  labels,
}: {
  m: MatchRow;
  team: TeamRow;
  opp: TeamRow | null;
  isHome: boolean;
  labels: CardLabels;
}) {
  const teamScore = isHome ? m.homeScore : m.awayScore;
  const oppScore = isHome ? m.awayScore : m.homeScore;
  const result =
    teamScore != null && oppScore != null
      ? teamScore > oppScore
        ? "win"
        : teamScore < oppScore
          ? "loss"
          : "draw"
      : null;
  const resultBadge =
    result === "win" ? (
      <Badge variant="success" className="text-[0.55rem]">
        {labels.win}
      </Badge>
    ) : result === "loss" ? (
      <Badge variant="danger" className="text-[0.55rem]">
        {labels.loss}
      </Badge>
    ) : (
      <Badge variant="outline" className="text-[0.55rem]">
        {labels.draw}
      </Badge>
    );
  return (
    <Link
      href={`/partido/${m.id}`}
      aria-label={`Partido ${m.code}`}
      className="group relative block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        <span className="flex items-center gap-2">
          <span>{m.code}</span>
          <Badge variant="outline" className="text-[0.55rem]">
            {localizedStageLabel(m.stage, STAGE_LABEL[m.stage] ?? m.stage, labels.stageLocale)}
          </Badge>
        </span>
        {resultBadge}
      </header>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-5 sm:gap-3">
        <TeamSide team={isHome ? team : opp} side="home" winner={result === "win" && isHome} labels={labels} />
        <ScoreCenter
          home={isHome ? m.homeScore : m.awayScore}
          away={isHome ? m.awayScore : m.homeScore}
          status="finished"
          scheduledAt={m.scheduledAt}
          labels={labels}
        />
        <TeamSide team={isHome ? opp : team} side="away" winner={result === "win" && !isHome} labels={labels} />
      </div>
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3 shrink-0" />
          {formatDateTime(m.scheduledAt, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </footer>
    </Link>
  );
}

function UpcomingRow({ m, opp, labels }: { m: MatchRow; opp: TeamRow | null; labels: CardLabels }) {
  return (
    <li>
      <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-arena)]/40">
        <Link
          href={`/partido/${m.id}`}
          aria-label={`Partido ${m.code}`}
          className="absolute inset-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
        />
        <span className="pointer-events-none relative flex items-center gap-2">
          <Badge variant="outline" className="text-[0.55rem]">
            {localizedStageLabel(m.stage, STAGE_LABEL[m.stage] ?? m.stage, labels.stageLocale)}
          </Badge>
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {m.code}
          </span>
        </span>
        <span className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-2 sm:ml-3">
          <span className="text-sm font-medium text-[var(--color-muted-foreground)]">{labels.vs}</span>
          {opp ? (
            <Link
              href={`/equipos/${opp.code}`}
              aria-label={opp.name}
              className="pointer-events-auto flex min-w-0 items-center gap-2 hover:text-[var(--color-arena)]"
            >
              <TeamFlag code={opp.code} size={20} />
              <span className="truncate text-sm font-medium">{opp.name}</span>
            </Link>
          ) : (
            <>
              <TeamFlag code={undefined} size={20} />
              <span className="truncate text-sm font-medium">{labels.tbd}</span>
            </>
          )}
        </span>
        <span className="pointer-events-none relative font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {formatDateTime(m.scheduledAt, {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {m.venue ? (
          <span className="pointer-events-none relative hidden items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] sm:inline-flex">
            <MapPin className="size-3" />
            {m.venue}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function TeamSide({
  team,
  side,
  winner,
  labels,
}: {
  team: TeamRow | null | undefined;
  side: "home" | "away";
  winner?: boolean;
  labels: CardLabels;
}) {
  const isHome = side === "home";
  return (
    <div
      className={`flex min-w-0 items-center gap-2 sm:gap-3 ${
        isHome ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span className={`shrink-0 transition-transform ${winner ? "scale-105" : ""}`}>
        <span className="block sm:hidden">
          <TeamFlag code={team?.code} size={32} />
        </span>
        <span className="hidden sm:block">
          <TeamFlag code={team?.code} size={40} />
        </span>
      </span>
      <div className="min-w-0">
        <p
          className="font-display text-sm leading-[1.05] tracking-tight sm:text-base"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {team?.name ?? labels.tbd}
        </p>
        <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          {team?.code ?? "—"}
        </p>
      </div>
    </div>
  );
}

function ScoreCenter({
  home,
  away,
  status,
  scheduledAt,
  big = false,
  labels,
}: {
  home: number | null;
  away: number | null;
  status: MatchRow["status"];
  scheduledAt: Date;
  big?: boolean;
  labels: CardLabels;
}) {
  if (status === "scheduled") {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1 sm:px-2">
        <span
          className={`font-display tracking-tight text-[var(--color-muted-foreground)]/70 ${
            big ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          }`}
        >
          {labels.vs}
        </span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {formatDateTime(scheduledAt, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-baseline gap-1.5 px-1 sm:gap-2 sm:px-2 ${
        status === "live" ? "text-[var(--color-arena)] glow-arena" : ""
      }`}
    >
      <span
        className={`font-display tabular leading-none tracking-tighter ${
          big ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {home ?? 0}
      </span>
      <span className="font-display text-lg leading-none text-[var(--color-muted-foreground)]/70 sm:text-xl">
        ·
      </span>
      <span
        className={`font-display tabular leading-none tracking-tighter ${
          big ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {away ?? 0}
      </span>
    </div>
  );
}

// ──────────────────────── Plantilla ────────────────────────

type PlayerRow = typeof players.$inferSelect;

function PlayerCard({
  player,
  goals,
  isTopScorer,
  topScorerLabel,
  goalsTitle,
}: {
  player: PlayerRow;
  goals: number;
  isTopScorer?: boolean;
  topScorerLabel: string;
  goalsTitle: string;
}) {
  const norm = player.position ? normalizePosition(player.position) : null;
  const style = norm ? POSITION_STYLE[norm] : null;
  const tone = style?.tone ?? "var(--color-border-strong)";
  const positionLabel = norm ?? player.position ?? "—";
  const highlight = isTopScorer && goals > 0;
  return (
    <li
      className="group relative flex items-stretch gap-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pr-3 transition-all hover:-translate-y-0.5 hover:border-[color-mix(in_oklch,var(--color-arena)_50%,var(--color-border))] hover:shadow-[var(--shadow-elev-2)]"
      style={
        highlight
          ? {
              borderColor: `color-mix(in oklch, var(--color-arena) 40%, var(--color-border))`,
              background: `color-mix(in oklch, var(--color-arena) 4%, var(--color-surface))`,
            }
          : undefined
      }
    >
      <span
        aria-hidden
        className="block w-1 shrink-0"
        style={{ background: tone }}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3 py-3">
        <div className="relative shrink-0">
          <PlayerAvatar
            name={player.name}
            photoUrl={player.photoUrl}
            jerseyNumber={player.jerseyNumber}
            size={60}
          />
          {player.photoUrl && player.jerseyNumber != null ? (
            <span
              className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-2)] font-display tabular text-[0.7rem] leading-none shadow-[var(--shadow-elev-1)]"
              aria-hidden
            >
              {player.jerseyNumber}
            </span>
          ) : null}
          {highlight ? (
            <span
              className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-arena)] shadow-[var(--shadow-arena)]"
              aria-label={topScorerLabel}
              title={topScorerLabel}
            >
              <Crown className="size-2.5 text-white" />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base leading-tight tracking-tight">
            {player.name}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.22em]"
              style={{
                background: `color-mix(in oklch, ${tone} 10%, transparent)`,
                color: tone,
              }}
            >
              {positionLabel}
            </span>
            {player.jerseyNumber != null ? (
              <span className="font-mono text-[0.6rem] tabular text-[var(--color-muted-foreground)]">
                #{player.jerseyNumber}
              </span>
            ) : null}
          </p>
        </div>
        {goals > 0 ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-display tabular text-sm ${
              highlight
                ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                : "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] text-[var(--color-arena)]"
            }`}
            title={goalsTitle}
          >
            <Goal className="size-3.5" />
            {goals}
          </span>
        ) : null}
      </div>
    </li>
  );
}
