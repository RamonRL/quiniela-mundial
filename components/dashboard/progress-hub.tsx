import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Crown, Sparkles, Swords, Trophy } from "lucide-react";
import { ProgressDonut } from "./progress-donut";
import { CategoryCard, type CategoryStatus, type CategoryBadge } from "./category-card";
import { NextDeadlineCard } from "./next-deadline-card";

type PreSatellite = {
  key: "groups" | "topscorer" | "specials";
  status: CategoryStatus;
  badge: CategoryBadge;
};

type OpenMatchday = {
  id: number;
  label: string;
  closesAt: string;
  filled: number;
  total: number;
};

type BracketSummary = {
  state: "open" | "closed";
  closesAt: string | null;
  filled: number;
  total: number;
};

export type ProgressHubProps =
  | {
      phase: "pre";
      nickname: string | null;
      groupsFilled: number;
      groupsTotal: number;
      topScorerDone: boolean;
      specialsFilled: number;
      specialsTotal: number;
    }
  | {
      phase: "running";
      nextDeadline: {
        kind: "matchday" | "bracket";
        label: string;
        href: string;
        closesAt: string;
        missing: number;
        total: number;
      } | null;
      openMatchdays: OpenMatchday[];
      bracket?: BracketSummary;
      preTorneoComplete: number;
      preTorneoTotal: number;
      /**
       * Modos Marcador / Solo Ganador: vista reducida. Sin la tarjeta de
       * "próximo cierre" destacado (que duplicaba la jornada ya listada
       * abajo) y sin badges "Empieza aquí" en las tarjetas.
       */
      compact?: boolean;
    };

export function ProgressHub(props: ProgressHubProps) {
  if (props.phase === "pre") {
    return <PreHub {...props} />;
  }
  return <RunningHub {...props} />;
}

function PreHub({
  nickname,
  groupsFilled,
  groupsTotal,
  topScorerDone,
  specialsFilled,
  specialsTotal,
}: Extract<ProgressHubProps, { phase: "pre" }>) {
  const t = useTranslations("progressHub");
  const groupsDone = groupsFilled >= groupsTotal && groupsTotal > 0;
  const specialsDone = specialsTotal > 0 && specialsFilled >= specialsTotal;
  const categories: PreSatellite[] = [
    { key: "groups", status: catStatus(groupsDone, groupsFilled > 0), badge: null },
    { key: "topscorer", status: catStatus(topScorerDone, false), badge: null },
    {
      key: "specials",
      status:
        specialsTotal === 0
          ? "locked"
          : catStatus(specialsDone, specialsFilled > 0),
      badge: null,
    },
  ];
  const firstIncomplete = categories.find((c) => c.status === "not-started" || c.status === "in-progress");
  if (firstIncomplete) {
    firstIncomplete.badge = firstIncomplete.status === "not-started" ? "start" : "continue";
  }

  const completed = categories.filter((c) => c.status === "complete").length;
  const visibleTotal = categories.filter((c) => c.status !== "locked").length;
  const isFresh = completed === 0 && categories.every((c) => c.status !== "in-progress");
  const isDone = completed === visibleTotal && visibleTotal > 0;

  const centerTop = isDone ? t("ready") : `${completed}/${visibleTotal}`;
  const centerBottom = isFresh
    ? t("centerEmpieza")
    : isDone
      ? t("centerPicksCompletos")
      : t("centerCompletado");

  const headline = isDone
    ? t("headlineDone", { name: nickname ?? t("yourPretournament") })
    : isFresh
      ? nickname
        ? t("headlineFreshNamed", { name: nickname })
        : t("headlineFreshAnon")
      : t("headlineRemaining", { count: visibleTotal - completed });

  const ctaTarget = firstIncomplete
    ? hrefFor(firstIncomplete.key)
    : "/predicciones";
  // El verbo del CTA depende de cuántas categorías llevas ya hechas, no
  // del estado de la siguiente. Esto da la cadencia narrativa que pidió
  // el usuario: empezar → seguir → acabar.
  const remaining = visibleTotal - completed;
  const ctaVerb =
    completed === 0
      ? t("ctaVerbStart")
      : remaining === 1
        ? t("ctaVerbFinish")
        : t("ctaVerbContinue");
  const ctaLabel = isDone
    ? t("ctaReview")
    : firstIncomplete
      ? t("ctaCombined", { verb: ctaVerb, category: labelFor(t, firstIncomplete.key) })
      : t("ctaAll");

  return (
    <section className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))]">
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" />
      <span aria-hidden className="pitch-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
      <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
        {/* Donut + headline */}
        <div
          data-tutorial-id="progress-hub-mobile"
          className="flex flex-col items-center gap-4 lg:items-start"
        >
          <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            <Sparkles className="size-3.5" />
            {isDone ? t("eyebrowDone") : isFresh ? t("eyebrowFresh") : t("eyebrowContinue")}
          </div>
          <ProgressDonut
            value={completed}
            total={visibleTotal || 1}
            centerTop={centerTop}
            centerBottom={centerBottom}
            tone={isDone ? "complete" : "active"}
          />
          <Link
            href={ctaTarget}
            className="group inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-arena)] px-5 py-3 font-display text-base text-white shadow-[var(--shadow-arena)] transition hover:scale-[1.02]"
          >
            <span className="font-medium">{ctaLabel}</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Right column — headline + satellites */}
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              {headline}
            </h2>
            <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
              {isDone ? t("subDone") : t("subDefault")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <CategoryCardWrapper
                key={c.key}
                kind={c.key}
                status={c.status}
                badge={c.badge}
                groupsFilled={groupsFilled}
                groupsTotal={groupsTotal}
                topScorerDone={topScorerDone}
                specialsFilled={specialsFilled}
                specialsTotal={specialsTotal}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RunningHub({
  nextDeadline,
  openMatchdays,
  bracket,
  preTorneoComplete,
  preTorneoTotal,
  compact = false,
}: Extract<ProgressHubProps, { phase: "running" }>) {
  const t = useTranslations("progressHub");
  const hasNothing = !nextDeadline && openMatchdays.length === 0 && !bracket;

  if (hasNothing) {
    return (
      <section
        data-tutorial-id="progress-hub-mobile"
        className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center sm:p-8"
      >
        <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
        <p className="relative font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("yourPool")}
        </p>
        <p className="relative mt-2 font-display text-2xl tracking-tight sm:text-3xl">
          {t("nothingToPredict")}
        </p>
        <p className="relative mt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {t("comeBack")}
        </p>
        {preTorneoTotal > 0 ? (
          <Link
            href="/predicciones"
            className="relative mt-4 inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)] hover:underline"
          >
            {t("seePretournamentPicks")} <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rise-in space-y-4">
      {nextDeadline ? (
        <div data-tutorial-id="progress-hub-mobile">
          <NextDeadlineCard
            label={nextDeadline.label}
            href={nextDeadline.href}
            closesAt={nextDeadline.closesAt}
            missing={nextDeadline.missing}
            total={nextDeadline.total}
          />
        </div>
      ) : null}

      {/* Satellites: other open matchdays + bracket. En modo compacto, si no
          hay tarjeta de próximo cierre (que normalmente lleva el ancla móvil
          del tutorial), este grid hace de ancla para no perder el spotlight. */}
      {openMatchdays.length > 0 || bracket ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-tutorial-id={
            compact && !nextDeadline ? "progress-hub-mobile" : undefined
          }
        >
          {openMatchdays.map((m) => {
            const filled = m.filled;
            const total = m.total;
            const status: CategoryStatus =
              filled === 0
                ? "not-started"
                : filled >= total
                  ? "complete"
                  : "in-progress";
            return (
              <CategoryCard
                key={m.id}
                icon={Swords}
                label={m.label}
                href={`/predicciones/jornada/${m.id}`}
                status={status}
                valueText={t("matchesFraction", { filled, total })}
                hintText={t("deadlineShort", { date: formatShort(m.closesAt) })}
                fraction={{ done: filled, total }}
                cta={status === "complete" ? t("review") : t("predict")}
                badge={!compact && status === "not-started" ? "start" : null}
              />
            );
          })}
          {bracket && bracket.state === "open" ? (
            <CategoryCard
              icon={Trophy}
              label={t("bracketLabel")}
              href="/predicciones/bracket"
              status={
                bracket.filled === 0
                  ? "not-started"
                  : bracket.filled >= bracket.total
                    ? "complete"
                    : "in-progress"
              }
              valueText={t("slotsFraction", { filled: bracket.filled, total: bracket.total })}
              hintText={
                bracket.closesAt
                  ? t("deadlineShort", { date: formatShort(bracket.closesAt) })
                  : t("bracketClosesFirst")
              }
              fraction={{ done: bracket.filled, total: bracket.total }}
              cta={bracket.filled >= bracket.total ? t("review") : t("predict")}
              badge={
                bracket.closesAt &&
                new Date(bracket.closesAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
                  ? "urgent"
                  : bracket.filled === 0
                    ? "start"
                    : null
              }
            />
          ) : null}
        </div>
      ) : null}

      {preTorneoTotal > 0 ? (
        <div className="flex items-center justify-end">
          <Link
            href="/predicciones"
            className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] hover:text-[var(--color-arena)]"
          >
            {t("seePretournamentPicksCount", { complete: preTorneoComplete, total: preTorneoTotal })}
            <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function CategoryCardWrapper({
  kind,
  status,
  badge,
  groupsFilled,
  groupsTotal,
  topScorerDone,
  specialsFilled,
  specialsTotal,
}: {
  kind: "groups" | "topscorer" | "specials";
  status: CategoryStatus;
  badge: CategoryBadge;
  groupsFilled: number;
  groupsTotal: number;
  topScorerDone: boolean;
  specialsFilled: number;
  specialsTotal: number;
}) {
  const t = useTranslations("progressHub");
  if (kind === "groups") {
    return (
      <CategoryCard
        icon={Trophy}
        label={t("groups")}
        href="/predicciones/grupos"
        status={status}
        valueText={t("groupsFraction", { filled: groupsFilled, total: groupsTotal })}
        hintText={t("groupsHint")}
        badge={badge}
        fraction={{ done: groupsFilled, total: groupsTotal }}
        cta={status === "complete" ? t("review") : t("predict")}
      />
    );
  }
  if (kind === "topscorer") {
    return (
      <CategoryCard
        icon={Crown}
        label={t("bota")}
        href="/predicciones/goleador-torneo"
        status={status}
        valueText={topScorerDone ? t("botaSent") : t("botaNone")}
        hintText={t("botaHint")}
        badge={badge}
        cta={status === "complete" ? t("review") : t("choose")}
      />
    );
  }
  if (status === "locked") {
    return (
      <CategoryCard
        icon={Sparkles}
        label={t("specials")}
        href="/predicciones/especiales"
        status="locked"
        valueText={t("specialsLockedValue")}
        hintText={t("specialsLockedHint")}
      />
    );
  }
  return (
    <CategoryCard
      icon={Sparkles}
      label={t("specials")}
      href="/predicciones/especiales"
      status={status}
      valueText={t("specialsFraction", { filled: specialsFilled, total: specialsTotal })}
      hintText={t("specialsHint")}
      badge={badge}
      fraction={{ done: specialsFilled, total: specialsTotal }}
      cta={status === "complete" ? t("review") : t("answer")}
    />
  );
}

function catStatus(done: boolean, started: boolean): CategoryStatus {
  if (done) return "complete";
  if (started) return "in-progress";
  return "not-started";
}

function hrefFor(kind: "groups" | "topscorer" | "specials"): string {
  if (kind === "groups") return "/predicciones/grupos";
  if (kind === "topscorer") return "/predicciones/goleador-torneo";
  return "/predicciones/especiales";
}

function labelFor(
  t: (k: string) => string,
  kind: "groups" | "topscorer" | "specials",
): string {
  if (kind === "groups") return t("groups");
  if (kind === "topscorer") return t("bota");
  return t("specials");
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
