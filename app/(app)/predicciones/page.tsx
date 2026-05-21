import Link from "next/link";
import {
  ArrowUpRight,
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
import { currentLeagueId } from "@/lib/leagues";
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
  const me = await requireUser();
  const now = new Date();
  const leagueId = (await currentLeagueId(me))!;

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

  const annotatedDays = await computeMatchdayStates(
    allDays.map((d) => ({
      id: d.id,
      name: d.name,
      stage: d.stage as Stage,
      predictionDeadlineAt: d.predictionDeadlineAt,
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
        eyebrow="Tus apuestas"
        title="Predicciones"
        description="Tus apuestas. Privadas hasta cada cierre."
        actions={<TutorialReplayButton />}
      />

      <ImportPredictionsBanner userId={me.id} activeLeagueId={leagueId} />

      {/* SECTION 1 — Pre-torneo */}
      <Section
        index="I"
        title="Pre-torneo"
        subtitle="Una vez por torneo · cierra en el kickoff"
        dataTutorialId="cat-pre-torneo"
        meta={
          preTorneoOpen
            ? `Cierre · ${formatDateTime(KICKOFF, {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Cerrado al kickoff"
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <CategoryCard
            cat="01"
            href="/predicciones/grupos"
            icon={<Users className="size-5" />}
            label="Posiciones por grupo"
            description="Ordena del 1º al 4º."
            statusBadge={
              groupPredCount === 12
                ? { variant: "success", text: "Completo" }
                : { variant: "warning", text: `${groupPredCount}/12 grupos` }
            }
            done={groupPredCount === 12}
            locked={!preTorneoOpen}
          />
          <CategoryCard
            cat="02"
            href="/predicciones/goleador-torneo"
            icon={<Target className="size-5" />}
            label="Bota de Oro"
            description="Tu candidato."
            statusBadge={
              topScorerPred
                ? { variant: "success", text: "Pick enviado" }
                : { variant: "warning", text: "Pendiente" }
            }
            done={!!topScorerPred}
            locked={!preTorneoOpen}
          />
          <CategoryCard
            cat="03"
            href="/predicciones/especiales"
            icon={<Sparkles className="size-5" />}
            label="Especiales"
            description="Balón, Guante, anfitrión…"
            statusBadge={
              answeredSpecials >= totalSpecials && totalSpecials > 0
                ? { variant: "success", text: "Completo" }
                : {
                    variant: "warning",
                    text: `${answeredSpecials}/${totalSpecials || "—"} resueltas`,
                  }
            }
            done={answeredSpecials >= totalSpecials && totalSpecials > 0}
            locked={false}
          />
        </div>
      </Section>

      {/* SECTION 2 — Por jornada */}
      <Section
        index="II"
        title="Jornada a jornada"
        subtitle="Marcador y goleador del partido en una sola jugada"
        dataTutorialId="cat-jornadas"
        meta={
          openDays.length > 0
            ? `${openDays.length} ${openDays.length === 1 ? "jornada abierta" : "jornadas abiertas"}`
            : waitingDays.length > 0
              ? "Próxima jornada bloqueada"
              : "Sin jornadas abiertas"
        }
      >
        {dayCards.length === 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Las jornadas aún no están publicadas.
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

      {/* SECTION 3 — Eliminatoria */}
      <Section
        index="III"
        title="Eliminatoria"
        subtitle="Se desbloquea al cerrar la fase de grupos"
        dataTutorialId="cat-eliminatoria"
        meta={
          bracketStatus.state === "open" && bracketStatus.closesAt
            ? `Cierre · ${formatDateTime(bracketStatus.closesAt, {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : bracketStatus.state === "waiting"
              ? "Aún no disponible"
              : "Cerrado"
        }
      >
        <BracketCard status={bracketStatus.state} closesAt={bracketStatus.closesAt} />
      </Section>
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
}: {
  index: string;
  title: string;
  subtitle: string;
  meta: string;
  children: React.ReactNode;
  dataTutorialId?: string;
}) {
  return (
    <section className="space-y-5" data-tutorial-id={dataTutorialId}>
      <header className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] pb-4">
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
              <h3 className="font-display text-3xl tracking-tight">Fase final</h3>
            </div>
          </header>
          {status === "waiting" ? (
            <Badge variant="warning" className="gap-1">
              <Lock className="size-3" /> Bloqueado
            </Badge>
          ) : status === "open" ? (
            <Badge variant="success">Abierto</Badge>
          ) : (
            <Badge variant="outline">Cerrado</Badge>
          )}
        </div>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {status === "waiting"
            ? "Se desbloquea al cerrar la fase de grupos."
            : status === "open"
              ? `Cierre: ${
                  closesAt
                    ? formatDateTime(closesAt, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "primer partido de R32"
                }.`
              : "Bracket cerrado. Los dieciseisavos ya arrancaron."}
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
  const remaining = day.total - day.filled;
  return (
    <Link
      href={`/predicciones/jornada/${day.id}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-6 transition hover:border-[var(--color-arena)] hover:shadow-[var(--shadow-elev-2)]"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="success">Abierta</Badge>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {day.stage} · Cat. 04
            </span>
          </div>
          <h3 className="font-display text-4xl tracking-tight">{day.name}</h3>
          <p className="font-editorial text-base italic text-[var(--color-muted-foreground)]">
            {day.filled}/{day.total}{" "}
            {day.total === 1 ? "partido predicho" : "partidos predichos"}.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="space-y-0.5 lg:text-right">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              Cierra
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
          </div>
          <p className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)] group-hover:underline">
            {remaining > 0 ? `${remaining} sin enviar` : "Ya enviada"}{" "}
            <ArrowUpRight className="size-3" />
          </p>
        </div>
      </div>
    </Link>
  );
}

function WaitingMatchday({ day }: { day: DayCard }) {
  return (
    <article className="grid gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
      <span className="grid size-12 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]">
        <Lock className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          Próxima · {day.stage}
        </p>
        <h3 className="font-display text-2xl tracking-tight">{day.name}</h3>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {day.reason ?? "Esperando que termine la ronda anterior."}
        </p>
      </div>
      <Badge variant="warning" className="self-start">
        Bloqueada
      </Badge>
    </article>
  );
}

function MatchdayMini({ day }: { day: DayCard }) {
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
              ? "Abierta"
              : day.state === "waiting"
                ? "Bloqueada"
                : "Cerrada"}
          </Badge>
        </div>
        <h4 className="font-display text-base tracking-tight">{day.name}</h4>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {day.state === "waiting"
            ? "Esperando"
            : day.state === "closed"
              ? "Cerrada"
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

