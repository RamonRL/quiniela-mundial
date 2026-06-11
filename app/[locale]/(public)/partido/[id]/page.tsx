import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MatchPredictionsReveal,
  type RevealRow,
} from "@/components/match/predictions-reveal";
import {
  MatchScoreboard,
  PickPanel,
  type Pick,
  type PickMode,
  type PickPlayer,
  type PickPoints,
  type PickResult,
  type PickState,
  type PickTeam,
  type ScoreboardGoal,
} from "@/components/match/pick-panel";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { getCurrentUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { intlLocale } from "@/lib/timezone";
import { LocalDateTime } from "@/components/local-date-time";
import { MapPin, Newspaper, Settings2 } from "lucide-react";
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

  // ── Datos para el marcador + panel TU PICK (componentes compartidos con
  //    /admin/preview). Modo de la liga activa; visitante → completo. ────────
  const mode: PickMode =
    leagueId != null
      ? (await getLeagueModes([leagueId])).get(leagueId) ?? "completo"
      : "completo";
  const sbState: PickState =
    match.status === "finished" ? "after" : match.status === "live" ? "during" : "before";
  const editable = new Date(match.scheduledAt).getTime() > Date.now();
  const isKO = match.stage !== "group";

  const sign = (a: number | null, b: number | null): "home" | "draw" | "away" | null =>
    a == null || b == null ? null : a > b ? "home" : a < b ? "away" : "draw";
  const sideOfTeam = (teamId: number | null | undefined): "home" | "away" | null =>
    teamId == null ? null : teamId === home?.id ? "home" : teamId === away?.id ? "away" : null;

  const homePT: PickTeam = home
    ? { code: home.code, name: home.name, href: `/equipos/${home.code}` }
    : { code: null, name: null };
  const awayPT: PickTeam = away
    ? { code: away.code, name: away.name, href: `/equipos/${away.code}` }
    : { code: null, name: null };

  // Goleadores → bajo el equipo al que CUENTA el gol (un autogol cuenta para el
  // rival del jugador). `matchScorers.teamId` es el equipo del jugador.
  const sbGoals: ScoreboardGoal[] = sortedScorers.map((s) => {
    const playerSide: "home" | "away" = s.teamId === home?.id ? "home" : "away";
    const side: "home" | "away" = s.isOwnGoal
      ? playerSide === "home"
        ? "away"
        : "home"
      : playerSide;
    return {
      side,
      name: playerById.get(s.playerId)?.name ?? t("playerFallback"),
      minute: s.minute,
      isFirstGoal: s.isFirstGoal,
      isPenalty: s.isPenalty,
      isOwnGoal: s.isOwnGoal,
    };
  });

  // Mi pick (mode-aware) + resultado real + puntos.
  const myScorerGoalsInMatch = myScorer
    ? scorerRows.filter((s) => s.playerId === myScorer.playerId && !s.isOwnGoal).length
    : 0;
  const myPick: Pick | null = myResult
    ? mode === "solo_ganador"
      ? {
          sign: sign(myResult.homeScore, myResult.awayScore),
          willGoToPens: myResult.willGoToPens,
          pensWinner: sideOfTeam(myResult.winnerTeamId),
        }
      : {
          homeScore: myResult.homeScore,
          awayScore: myResult.awayScore,
          willGoToPens: myResult.willGoToPens,
          pensWinner: sideOfTeam(myResult.winnerTeamId),
        }
    : null;
  const pickResult: PickResult | null =
    sbState === "before"
      ? null
      : {
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          sign: sign(match.homeScore, match.awayScore),
          scorerGoals: myScorerGoalsInMatch,
          wentToPens: match.wentToPens,
          pensWinner: sideOfTeam(match.winnerTeamId),
        };
  const markerPts = myLedgerRows
    .filter((e) => MARKER_SOURCES.has(e.source))
    .map((e) => ({ id: e.id, label: sourceLabel(t, e.source), points: e.points }));
  const scorerPts = myLedgerRows
    .filter((e) => SCORER_SOURCES.has(e.source))
    .map((e) => ({ id: e.id, label: sourceLabel(t, e.source), points: e.points }));
  const pickPoints: PickPoints | null =
    sbState === "after"
      ? {
          marker: markerPts,
          scorer: scorerPts,
          total: [...markerPts, ...scorerPts].reduce((acc, e) => acc + e.points, 0),
        }
      : null;
  const scorerPlayer = myScorer ? playerById.get(myScorer.playerId) ?? null : null;
  const scorerTeam = scorerPlayer ? teamById.get(scorerPlayer.teamId) ?? null : null;
  const scorerPP: PickPlayer | null = scorerPlayer
    ? {
        name: scorerPlayer.name,
        photoUrl: scorerPlayer.photoUrl,
        jerseyNumber: scorerPlayer.jerseyNumber,
        position: scorerPlayer.position,
        teamCode: scorerTeam?.code ?? null,
        teamHref: scorerTeam ? `/equipos/${scorerTeam.code}` : null,
      }
    : null;

  // Predicciones de la liga (públicas desde el saque inicial).
  const revealRows: RevealRow[] = allCombined.map((c) => {
    const player = c.scorerPlayerId ? playerById.get(c.scorerPlayerId) ?? null : null;
    const scorerScored = player
      ? sortedScorers.some((s) => s.playerId === player.id)
      : false;
    // Verde = "acertó". En completo/marcador: marcador exacto. En solo ganador:
    // acertó el 1X2 (el 90' para empates a penaltis).
    const resolved = match.homeScore != null && match.awayScore != null;
    const exactScore =
      mode === "solo_ganador"
        ? resolved && sign(c.homeScore, c.awayScore) === sign(match.homeScore, match.awayScore)
        : resolved && c.homeScore === match.homeScore && c.awayScore === match.awayScore;
    return {
      userId: c.userId,
      display: c.nickname || c.email.split("@")[0],
      avatarUrl: c.avatarUrl,
      isMe: me != null && c.userId === me.id,
      homeScore: c.homeScore,
      awayScore: c.awayScore,
      willGoToPens: c.willGoToPens,
      exactScore,
      scorerName: player?.name ?? null,
      scorerScored,
    };
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

      {/* Marcador del partido — componente compartido con /admin/preview. */}
      <MatchScoreboard
        home={homePT}
        away={awayPT}
        state={sbState}
        stage={match.stage}
        group={matchGroup?.code ?? null}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        minute={match.liveMinute}
        phase={match.livePhase}
        kickoffISO={match.scheduledAt.toISOString()}
        wentToPens={match.wentToPens}
        homePenScore={match.homeScorePen}
        awayPenScore={match.awayScorePen}
        winnerName={
          isKO && match.winnerTeamId
            ? teamById.get(match.winnerTeamId)?.name ?? null
            : null
        }
        goals={sbGoals}
        dateLabel={
          <LocalDateTime
            iso={match.scheduledAt.toISOString()}
            ssr={formatDateTime(match.scheduledAt, { locale: dateLocale })}
          />
        }
        venue={match.venue ? <VenueLink venue={match.venue} /> : null}
        t={t}
      />

      {/* My pick — visible solo para usuarios autenticados; para visitantes
          mostramos un CTA invitando a crear su quiniela. */}
      {me ? (
        <PickPanel
          mode={mode}
          state={sbState}
          home={homePT}
          away={awayPT}
          pick={myPick}
          result={pickResult}
          points={pickPoints}
          scorer={mode === "completo" ? scorerPP : null}
          editHref={
            editable && match.matchdayId != null
              ? `/predicciones/jornada/${match.matchdayId}`
              : null
          }
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

      {/* Predicciones de la liga — públicas desde el saque inicial; visible
          solo para usuarios con sesión (las predicciones son por liga). */}
      {me && predsPublic ? (
        <MatchPredictionsReveal
          rows={revealRows}
          showScorer={mode === "completo"}
          winnerMode={mode === "solo_ganador"}
          homeName={home?.name ?? null}
          awayName={away?.name ?? null}
          isKnockout={isKO}
          t={t}
        />
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

