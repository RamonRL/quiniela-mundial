import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Circle,
  Lock,
  Sparkles,
  Swords,
  Target,
  Users,
} from "lucide-react";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { localizedMatchdayName } from "@/lib/matchday-names";
import {
  matchdays,
  matches,
  predGroupRanking,
  predMatchResult,
  predSpecial,
  predTournamentTopScorer,
  specialPredictions,
} from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { computeMatchdayStates, type Stage } from "@/lib/matchday-state";
import { getBracketStatus } from "@/lib/bracket-state";
import { ImportPredictionsBanner } from "@/components/predictions/import-banner";
import { TutorialReplayButton } from "@/components/tutorial/replay-button";

export const metadata = { title: "Mis predicciones" };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

export default async function PrediccionesHub() {
  const t = await getTranslations("predHub");
  const me = await requireUser();
  const now = new Date();
  const leagueId = (await currentLeagueId(me))!;
  // Modo de la liga activa. Marcador y Solo Ganador solo predicen partidos:
  // ocultan Pre-torneo (grupos/bota/especiales) y Eliminatoria (bracket).
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  const onlyMatches = mode !== "completo";

  const [
    [{ groupPredCount }],
    [topScorerPred],
    specials,
    mySpecialPicks,
    bracketStatus,
    allDays,
    matchTotals,
    myResultPicks,
  ] = await Promise.all([
    db
      .select({ groupPredCount: sql<number>`count(*)::int` })
      .from(predGroupRanking)
      .where(
        and(
          eq(predGroupRanking.userId, me.id),
          eq(predGroupRanking.leagueId, leagueId),
        ),
      ),
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
    db
      .select()
      .from(specialPredictions)
      .orderBy(asc(specialPredictions.orderIndex)),
    db
      .select()
      .from(predSpecial)
      .where(and(eq(predSpecial.userId, me.id), eq(predSpecial.leagueId, leagueId))),
    getBracketStatus(),
    db
      .select()
      .from(matchdays)
      .orderBy(asc(matchdays.orderIndex), asc(matchdays.predictionDeadlineAt)),
    db
      .select({
        matchdayId: matches.matchdayId,
        total: sql<number>`count(*)::int`,
      })
      .from(matches)
      .groupBy(matches.matchdayId),
    db
      .select({
        matchdayId: matches.matchdayId,
        filled: sql<number>`count(*)::int`,
      })
      .from(predMatchResult)
      .innerJoin(matches, eq(matches.id, predMatchResult.matchId))
      .where(
        and(
          eq(predMatchResult.userId, me.id),
          eq(predMatchResult.leagueId, leagueId),
        ),
      )
      .groupBy(matches.matchdayId),
  ]);

  const totalByDay = new Map(matchTotals.map((r) => [r.matchdayId ?? 0, r.total]));
  const filledByDay = new Map(myResultPicks.map((r) => [r.matchdayId ?? 0, r.filled]));

  const mdLocale = await getLocale();
  const annotatedDays = await computeMatchdayStates(
    allDays.map((d) => ({
      id: d.id,
      name: localizedMatchdayName(d.name, d.stage, mdLocale),
      stage: d.stage as Stage,
      predictionDeadlineAt: d.predictionDeadlineAt, // se sigue mostrando como "primer kickoff" en las cards
    })),
  );
  const dayCards = annotatedDays.map((d) => {
    const total = totalByDay.get(d.id) ?? 0;
    const filled = filledByDay.get(d.id) ?? 0;
    return { ...d, total, filled };
  });

  const openDays = dayCards.filter((d) => d.state === "open");
  const waitingDays = dayCards.filter((d) => d.state === "waiting");
  const closedDays = dayCards.filter((d) => d.state === "closed");
  const featured = openDays[0] ?? null;
  const otherOpen = openDays.slice(1);

  const totalSpecials = specials.length;
  const answeredSpecials = mySpecialPicks.length;

  const preTorneoOpen = KICKOFF.getTime() > now.getTime();

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow={t("headerEyebrow")}
        title={t("headerTitle")}
        description={t("headerDesc")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/puntuacion?modo=${mode}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-arena)]"
            >
              <Calculator className="size-3.5" />
              {t("howScored")}
            </Link>
            <TutorialReplayButton />
          </div>
        }
      />

      {/* El banner decide solo si hay un origen válido (otra quiniela del
          mismo modo con más picks); por eso ya no se filtra por modo aquí. */}
      <ImportPredictionsBanner userId={me.id} activeLeagueId={leagueId} />

      {/* SECTION 1 — Pre-torneo (solo en modo completo) */}
      {!onlyMatches ? (
      <Section
        index="I"
        title={t("preTitle")}
        subtitle={t("preSubtitle")}
        dataTutorialId="cat-pre-torneo"
        dataTutorialIdMobile="cat-pre-torneo-mobile"
        meta={
          preTorneoOpen
            ? t("closeMeta", {
                date: formatDateTime(KICKOFF, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })
            : t("preClosedAtKickoff")
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <CategoryCard
            cat="01"
            href="/predicciones/grupos"
            icon={<Users className="size-5" />}
            label={t("groupsLabel")}
            description={t("groupsDesc")}
            statusBadge={
              groupPredCount === 12
                ? { variant: "success", text: t("complete") }
                : { variant: "warning", text: t("groupsCount", { n: groupPredCount }) }
            }
            done={groupPredCount === 12}
            locked={!preTorneoOpen}
          />
          <CategoryCard
            cat="02"
            href="/predicciones/goleador-torneo"
            icon={<Target className="size-5" />}
            label={t("botaLabel")}
            description={t("botaDesc")}
            statusBadge={
              topScorerPred
                ? { variant: "success", text: t("botaSent") }
                : { variant: "warning", text: t("pending") }
            }
            done={!!topScorerPred}
            locked={!preTorneoOpen}
          />
          <CategoryCard
            cat="03"
            href="/predicciones/especiales"
            icon={<Sparkles className="size-5" />}
            label={t("specialsLabel")}
            description={t("specialsDesc")}
            statusBadge={
              answeredSpecials >= totalSpecials && totalSpecials > 0
                ? { variant: "success", text: t("complete") }
                : {
                    variant: "warning",
                    text: t("specialsCount", {
                      answered: answeredSpecials,
                      total: totalSpecials || "—",
                    }),
                  }
            }
            done={answeredSpecials >= totalSpecials && totalSpecials > 0}
            locked={false}
          />
        </div>
      </Section>
      ) : null}

      {/* SECTION 2 — Por jornada (en todos los modos) */}
      <Section
        index={onlyMatches ? "I" : "II"}
        title={t("jornadasTitle")}
        subtitle={
          mode === "solo_ganador"
            ? t("jornadasDescSolo")
            : mode === "marcador"
              ? t("jornadasDescMarcador")
              : t("jornadasDescCompleto")
        }
        dataTutorialId="cat-jornadas"
        dataTutorialIdMobile="cat-jornadas-mobile"
        meta={
          openDays.length > 0
            ? t("jornadasOpen", { count: openDays.length })
            : waitingDays.length > 0
              ? t("jornadasNextBlocked")
              : t("jornadasNoneOpen")
        }
      >
        {dayCards.length === 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("jornadasNotPublished")}
          </p>
        ) : (
          <div className="space-y-4">
            {featured ? (
              <FeaturedMatchday day={featured} />
            ) : waitingDays.length > 0 ? (
              <WaitingMatchday day={waitingDays[0]} />
            ) : null}

            {(otherOpen.length > 0 || waitingDays.length > 1 || closedDays.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherOpen.map((d) => (
                  <MatchdayMini key={d.id} day={d} />
                ))}
                {waitingDays.slice(featured ? 0 : 1).map((d) => (
                  <MatchdayMini key={d.id} day={d} />
                ))}
                {closedDays.map((d) => (
                  <MatchdayMini key={d.id} day={d} />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* SECTION 3 — Eliminatoria (solo en modo completo) */}
      {!onlyMatches ? (
      <Section
        index="III"
        title={t("eliminatoriaTitle")}
        subtitle={t("eliminatoriaSubtitle")}
        dataTutorialId="cat-eliminatoria"
        meta={
          bracketStatus.state === "open" && bracketStatus.closesAt
            ? t("closeMeta", {
                date: formatDateTime(bracketStatus.closesAt, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })
            : bracketStatus.state === "waiting"
              ? t("bracketNotYet")
              : t("bracketClosed")
        }
      >
        <BracketCard status={bracketStatus.state} closesAt={bracketStatus.closesAt} />
      </Section>
      ) : null}
    </div>
  );
}

function Section({
  index,
  title,
  subtitle,
  meta,
  children,
  dataTutorialId,
  dataTutorialIdMobile,
}: {
  index: string;
  title: string;
  subtitle: string;
  meta: string;
  children: React.ReactNode;
  dataTutorialId?: string;
  dataTutorialIdMobile?: string;
}) {
  return (
    <section className="space-y-5" data-tutorial-id={dataTutorialId}>
      <header
        data-tutorial-id={dataTutorialIdMobile}
        className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] pb-4"
      >
        <div className="flex items-end gap-4">
          <span
            aria-hidden
            className="font-display text-5xl leading-none text-[var(--color-arena)] glow-arena"
          >
            {index}
          </span>
          <div className="space-y-0.5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {subtitle}
            </p>
            <h2 className="font-display text-3xl tracking-tight">{title}</h2>
          </div>
        </div>
        <p className="hidden font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:block">
          {meta}
        </p>
      </header>
      {children}
    </section>
  );
}

function CategoryCard({
  cat,
  href,
  icon,
  label,
  description,
  statusBadge,
  done,
  locked,
}: {
  cat: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  statusBadge: { variant: "success" | "warning"; text: string };
  done: boolean;
  locked: boolean;
}) {
  const Inner = (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border bg-[var(--color-surface)] p-5 transition-all duration-200 ${
        locked
          ? "border-[var(--color-border)] opacity-70"
          : "border-[var(--color-border)] hover:-translate-y-0.5 hover:border-[var(--color-arena)]/50 hover:shadow-[var(--shadow-elev-2)]"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-5 select-none font-display text-[6rem] leading-none text-[var(--color-foreground)] opacity-[0.04]"
      >
        {cat}
      </span>
      <div className="relative flex flex-1 flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`grid size-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] ${
                done ? "text-[var(--color-success)]" : "text-[var(--color-arena)]"
              }`}
            >
              {icon}
            </span>
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Cat. {cat}
              </p>
              <h3 className="font-display text-xl tracking-tight">{label}</h3>
            </div>
          </div>
          {done ? (
            <CheckCircle2 className="size-5 text-[var(--color-success)]" />
          ) : (
            <Circle className="size-5 text-[var(--color-muted-foreground)]" />
          )}
        </header>
        <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
          {description}
        </p>
        <Badge variant={statusBadge.variant} className="mt-auto self-start">
          {statusBadge.text}
        </Badge>
      </div>
    </article>
  );
  if (locked) return Inner;
  return (
    <Link href={href} className="group block">
      {Inner}
    </Link>
  );
}

function BracketCard({
  status,
  closesAt,
}: {
  status: "waiting" | "open" | "closed";
  closesAt: Date | null;
}) {
  const t = useTranslations("predHub");
  const baseInner = (
    <article
      className={`group relative overflow-hidden rounded-xl border p-6 transition-all duration-200 ${
        status === "open"
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] hover:border-[var(--color-arena)] hover:shadow-[var(--shadow-elev-2)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] opacity-90"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 select-none font-display text-[10rem] leading-none text-[var(--color-foreground)] opacity-[0.04]"
      >
        04
      </span>
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <header className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-arena)]">
              <Swords className="size-6" />
            </span>
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Cat. 04
              </p>
              <h3 className="font-display text-3xl tracking-tight">{t("bracketFinalPhase")}</h3>
            </div>
          </header>
          {status === "waiting" ? (
            <Badge variant="warning" className="gap-1">
              <Lock className="size-3" /> {t("bracketBlocked")}
            </Badge>
          ) : status === "open" ? (
            <Badge variant="success">{t("bracketOpen")}</Badge>
          ) : (
            <Badge variant="outline">{t("bracketClosed")}</Badge>
          )}
        </div>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {status === "waiting"
            ? t("bracketWaitingDesc")
            : status === "open"
              ? t("bracketClosesPrefix", {
                  date: closesAt
                    ? formatDateTime(closesAt, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : t("bracketClosesFirst"),
                })
              : t("bracketClosedDesc")}
        </p>
      </div>
    </article>
  );
  if (status === "waiting") return baseInner;
  return (
    <Link href="/predicciones/bracket" className="block">
      {baseInner}
    </Link>
  );
}

type DayCard = {
  id: number;
  name: string;
  stage: Stage;
  predictionDeadlineAt: Date;
  state: "waiting" | "open" | "closed";
  reason?: string;
  total: number;
  filled: number;
};

function FeaturedMatchday({ day }: { day: DayCard }) {
  const t = useTranslations("predHub");
  const remaining = day.total - day.filled;
  return (
    <Link
      href={`/predicciones/jornada/${day.id}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-6 transition hover:border-[var(--color-arena)] hover:shadow-[var(--shadow-elev-2)]"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="success">{t("open")}</Badge>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {day.stage} · Cat. 04
            </span>
          </div>
          <h3 className="font-display text-4xl tracking-tight">{day.name}</h3>
          <p className="font-editorial text-base italic text-[var(--color-muted-foreground)]">
            {t("matchesPredicted", { filled: day.filled, total: day.total })}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="space-y-0.5 lg:text-right">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              {t("starts")}
            </p>
            <p className="font-display text-2xl tracking-tight">
              {formatDateTime(day.predictionDeadlineAt, {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {t("eachMatchCloses")}
            </p>
          </div>
          <p className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)] group-hover:underline">
            {remaining > 0 ? t("unsent", { remaining }) : t("alreadySent")}{" "}
            <ArrowUpRight className="size-3" />
          </p>
        </div>
      </div>
    </Link>
  );
}

function WaitingMatchday({ day }: { day: DayCard }) {
  const t = useTranslations("predHub");
  return (
    <article className="grid gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
      <span className="grid size-12 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]">
        <Lock className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("upcoming")} · {day.stage}
        </p>
        <h3 className="font-display text-2xl tracking-tight">{day.name}</h3>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {day.reason ?? t("waitingReason")}
        </p>
      </div>
      <Badge variant="warning" className="self-start">
        {t("blocked")}
      </Badge>
    </article>
  );
}

function MatchdayMini({ day }: { day: DayCard }) {
  const t = useTranslations("predHub");
  const inner = (
    <article
      className={`flex h-full flex-col justify-between gap-3 rounded-md border p-4 transition ${
        day.state === "open"
          ? "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-arena)]/50"
          : day.state === "waiting"
            ? "border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] opacity-70"
            : "border-[var(--color-border)] bg-[var(--color-surface-2)] opacity-80"
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[0.6rem] uppercase">
            {day.stage}
          </Badge>
          <Badge
            variant={
              day.state === "open"
                ? "success"
                : day.state === "waiting"
                  ? "warning"
                  : "outline"
            }
            className="text-[0.6rem]"
          >
            {day.state === "open"
              ? t("open")
              : day.state === "waiting"
                ? t("blocked")
                : t("closedFem")}
          </Badge>
        </div>
        <h4 className="font-display text-base tracking-tight">{day.name}</h4>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {day.state === "waiting"
            ? t("waiting")
            : day.state === "closed"
              ? t("closedFem")
              : `${day.filled}/${day.total}`}
        </span>
        <span className="text-[0.6rem] text-[var(--color-muted-foreground)]">
          {formatDateTime(day.predictionDeadlineAt, {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </article>
  );
  if (day.state === "waiting") {
    return <div key={day.id}>{inner}</div>;
  }
  return (
    <Link key={day.id} href={`/predicciones/jornada/${day.id}`} className="block">
      {inner}
    </Link>
  );
}

