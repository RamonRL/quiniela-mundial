import { Suspense } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Crown, Trophy } from "lucide-react";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leagues,
  pointsLedger,
  predBracketSlot,
  predGroupRanking,
  predSpecial,
  predTournamentTopScorer,
  specialPredictions,
} from "@/lib/db/schema";
import { LeagueWelcomeDialog } from "@/components/leagues/league-welcome-dialog";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { requireUser } from "@/lib/auth/guards";
import { TutorialAutoStart } from "@/components/tutorial/auto-start";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { getDateContext } from "@/lib/timezone-server";
import { ActivityFeedCard } from "./activity-feed-card";
import { DashboardNewsStrip } from "./news-strip";
import { ImportPredictionsBanner } from "@/components/predictions/import-banner";
import { loadOpenMatchdays, type OpenMatchdayEntry } from "@/lib/deadlines";
import { getBracketStatus } from "@/lib/bracket-state";
import { ProgressHub, type ProgressHubProps } from "@/components/dashboard/progress-hub";
import { GroupStandingsSlider } from "@/components/dashboard/group-standings-slider";
import { DashboardPlayerCard } from "@/components/dashboard/player-card";
import { InstallBanner } from "@/components/install/install-banner";
import { PatchNotesBoard } from "@/components/dashboard/patch-notes-board";
import { SponsorStrip } from "@/components/dashboard/sponsor-strip";
import { loadLeagueSponsors, type SponsorLogo } from "@/lib/sponsors";
import { HeroCard, type HeroData } from "@/components/dashboard/hero-card";
import { loadHeroData } from "@/lib/dashboard/hero-data";
import {
  countLeagueMembers,
  loadLeaderboard,
  type LeaderboardEntry,
} from "@/lib/leaderboard";

const KICKOFF = process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z";

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
  // Tablón y noticias se escriben solo en castellano → ocultos fuera de ES.
  const locale = await getLocale();
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
  const { timeZone: userTz } = await getDateContext();
  const kickoff = new Date(KICKOFF);
  const tournamentStarted = kickoff.getTime() <= Date.now();

  // Pre-torneo nadie tiene puntos: no hay nada que rankear ni actividad
  // que listar, así que evitamos por completo `myPoints`, `leagueHasPoints`,
  // `loadLeaderboard`, `loadActivityFeed` y `pendingScorerCount`. Pasamos
  // de ~8 queries a ~6 pre-torneo, y a la mitad de coste agregado.
  const computeRanking = tournamentStarted;

  const [
    groupCount,
    topScorerSet,
    mySpecialsRow,
    totalSpecialsRow,
    bracketStatus,
    bracketFilledRow,
    openMatchdays,
    myPointsRows,
    leaderboardEntries,
    leagueMemberCountFallback,
    sponsorRows,
    heroData,
  ] = await Promise.all([
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
    safe(loadLeagueSponsors(leagueId), [] as SponsorLogo[], "sponsors"),
    safe(
      loadHeroData({ userId: me.id, leagueId, locale, timeZone: userTz }),
      null as HeroData | null,
      "heroData",
    ),
  ]);
  const sponsors = sponsorRows;
  const myPoints = myPointsRows[0]?.total ?? 0;

  // Activity feed se ha movido a un async Server Component dentro de
  // <Suspense> más abajo — descongestiona el critical path: la página
  // hace su primer paint sin esperar a `loadActivityFeed`, que streamea
  // su HTML cuando esté listo.
  const sorted = leaderboardEntries;
  const totalParticipants = computeRanking ? sorted.length : leagueMemberCountFallback;
  // Posición real en el ranking. El leaderboard incluye a TODOS los miembros
  // (LEFT JOIN al ledger → 0 pts cuentan), así que un participante con 0 puntos
  // SÍ tiene posición; no debe salir "sin clasificar". Null solo si no está en
  // la lista (p. ej. pre-torneo, cuando no se calcula el ranking).
  const myPosition =
    sorted.length > 0
      ? sorted.findIndex((r) => r.userId === me.id) + 1 || null
      : null;
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
          variant={params.welcome === "created" ? "created" : "joined"}
        />
      ) : null}
      <TutorialAutoStart
        firstSeen={me.tutorialCompletedAt == null}
        holdForWelcome={welcomeLeague != null}
      />
      <Suspense fallback={<div aria-hidden />}>
        <ImportPredictionsBanner userId={me.id} activeLeagueId={leagueId} />
      </Suspense>

      {/* Cabecera superior: si la liga tiene patrocinadores, su franja de
          logos SUSTITUYE al logo FWC (más espacio para las marcas). Si no,
          el mark estándar FWC26 centrado. */}
      {sponsors.length > 0 ? (
        <SponsorStrip sponsors={sponsors} />
      ) : (
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
      )}

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

      {/* Banner promo de instalación de la app — encima de la card principal.
          Se cierra y no vuelve a salir (localStorage). */}
      <InstallBanner />

      {/* Card principal: marcador de retransmisión — directos (1 o 2) o el
          siguiente partido. Sustituye al hero antiguo y al Live HUD. */}
      {heroData ? (
        <>
          <RealtimeRefresher
            channelKey="dashboard-hero"
            subscriptions={
              heroData.featuredKind === "live"
                ? [{ table: "matches" }, { table: "match_scorers" }]
                : [{ table: "matches" }]
            }
          />
          <HeroCard data={heroData} />
        </>
      ) : null}

      {/* Card de jugador: tu identidad + cómo te va en ESTA quiniela (apodo,
          foto, posición, puntos, exactos, goleadores pendientes), justo bajo
          la card principal. Toda la card lleva a tu perfil. */}
      <DashboardPlayerCard
        userId={me.id}
        display={me.nickname || me.email.split("@")[0]}
        avatarUrl={me.avatarUrl}
        position={myPosition}
        points={myPoints}
        exactScores={exactScores}
        labels={{
          eyebrow: t("pcEyebrow"),
          position: t("pcPosition"),
          of: t("statPositionOf", { n: totalParticipants }),
          points: t("pcPts"),
          exact: t("pcExact"),
          noRank: t("pcNoRank"),
          view: t("pcView"),
        }}
      />

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
        </div>
      </section>

      {/* Cabeza de tabla + últimos puntos — 2 columnas. En móvil se apilan:
          primero el ranking, luego tus puntos. */}
      <section className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        {/* Top 5 (izquierda) — cada card lleva al perfil del jugador */}
        <div className="rise-in relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
          <header className="relative flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-[var(--color-arena)]" />
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-foreground)]">
                {t("top5Short")}
              </p>
            </div>
            <Link
              href="/ranking"
              className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
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
                    <li key={p.userId}>
                      {/* Toda la card es clicable → perfil del jugador. */}
                      <Link
                        href={`/ranking/${p.userId}`}
                        aria-label={`Perfil de ${display}`}
                        className={`group flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 outline-none transition hover:-translate-y-px hover:shadow-[var(--shadow-elev-1)] focus-visible:ring-2 focus-visible:ring-[var(--color-arena)] ${
                          isLeader
                            ? "border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_10%,var(--color-surface))] shadow-[var(--shadow-arena)] hover:border-[var(--color-arena)]"
                            : isMe
                              ? "border-[var(--color-arena)]/45 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] hover:border-[var(--color-arena)]/70"
                              : podiumTier
                                ? "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-arena)]/50"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/50"
                        }`}
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-md font-display tabular text-xl leading-none ${
                            isLeader
                              ? "border border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_18%,transparent)] text-[var(--color-arena)] glow-arena"
                              : podiumTier
                                ? "border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-arena)]"
                                : "text-[var(--color-muted-foreground)]"
                          }`}
                        >
                          {isLeader ? <Crown className="size-4" /> : position}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base leading-none tracking-tight transition-colors group-hover:text-[var(--color-arena)]">
                            {display}
                            {isMe ? (
                              <span className="ml-1.5 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
                                tú
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <span
                          className={`font-display tabular leading-none ${
                            isLeader
                              ? "text-3xl text-[var(--color-arena)] glow-arena"
                              : "text-2xl"
                          }`}
                        >
                          {p.totalPoints}
                        </span>
                      </Link>
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
                <span className="min-w-0 truncate">
                  {t("pcPosition")} ·{" "}
                  <span className="font-display text-base text-[var(--color-arena)]">#{myPosition}</span>{" "}
                  ·{" "}
                  <span className="font-display text-base text-[var(--color-arena)]">{myPoints}</span>{" "}
                  {t("pcPts")}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {t("pcView")} <ArrowRight className="size-3" />
                </span>
              </Link>
            </footer>
          ) : null}
        </div>

        {/* Últimos puntos · tu ledger (derecha) — streamed via Suspense. */}
        <Suspense fallback={null}>
          <ActivityFeedCard userId={me.id} leagueId={leagueId} />
        </Suspense>
      </section>

      {/* Cómo van los 12 grupos — menos prioritario, justo antes del tablón.
          1º-2º en rojo y 3º en amarillo (mejores terceros). */}
      <Suspense fallback={null}>
        <GroupStandingsSlider />
      </Suspense>

      {/* Tablón de novedades de la app — patch notes que el admin va
          publicando (features, fixes, mejoras). Si no hay nada publicado
          el componente renderiza null y no añade ruido. Solo en ES: las
          notas no se traducen una a una. */}
      {locale === "es" ? (
        <Suspense fallback={null}>
          <PatchNotesBoard />
        </Suspense>
      ) : null}

      {/* Mundial al día — últimas 2 noticias, streamed para no bloquear
          el critical path del dashboard. Solo en ES (contenido editorial
          sin traducir). */}
      {locale === "es" ? (
        <Suspense fallback={null}>
          <DashboardNewsStrip />
        </Suspense>
      ) : null}
    </div>
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
