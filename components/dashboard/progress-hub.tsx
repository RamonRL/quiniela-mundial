import Link from "next/link";
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

  const centerTop = isDone ? "¡LISTO!" : `${completed}/${visibleTotal}`;
  const centerBottom = isFresh
    ? "EMPIEZA"
    : isDone
      ? "PICKS COMPLETOS"
      : "COMPLETADO";

  const headline = isDone
    ? `${nickname ?? "Tu pre-torneo"} está listo`
    : isFresh
      ? `Hola${nickname ? `, ${nickname}` : ""}. Cierra tus 3 picks pre-torneo`
      : `Te quedan ${visibleTotal - completed} ${
          visibleTotal - completed === 1 ? "categoría" : "categorías"
        } por cerrar`;

  const ctaTarget = firstIncomplete
    ? hrefFor(firstIncomplete.key)
    : "/predicciones";
  // El verbo del CTA depende de cuántas categorías llevas ya hechas, no
  // del estado de la siguiente. Esto da la cadencia narrativa que pidió
  // el usuario: empezar → seguir → acabar.
  const remaining = visibleTotal - completed;
  const ctaVerb =
    completed === 0 ? "Empezar por" : remaining === 1 ? "Acaba con" : "Sigue con";
  const ctaLabel = isDone
    ? "Revisar mis picks"
    : firstIncomplete
      ? `${ctaVerb} ${labelFor(firstIncomplete.key)}`
      : "Ver todas las categorías";

  return (
    <section className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))]">
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" />
      <span aria-hidden className="pitch-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
      <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
        {/* Donut + headline */}
        <div className="flex flex-col items-center gap-4 lg:items-start">
          <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            <Sparkles className="size-3.5" />
            {isDone ? "Pre-torneo listo" : isFresh ? "Bienvenido al Mundial" : "Continúa donde lo dejaste"}
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
              {isDone
                ? "Puedes seguir editando tus picks hasta el kickoff."
                : "Tres picks ahora. Se cierran al kickoff del torneo."}
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
}: Extract<ProgressHubProps, { phase: "running" }>) {
  const hasNothing = !nextDeadline && openMatchdays.length === 0 && !bracket;

  if (hasNothing) {
    return (
      <section className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center sm:p-8">
        <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
        <p className="relative font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          Tu quiniela
        </p>
        <p className="relative mt-2 font-display text-2xl tracking-tight sm:text-3xl">
          Nada que predecir ahora
        </p>
        <p className="relative mt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Vuelve cuando se acerque el próximo cierre.
        </p>
        {preTorneoTotal > 0 ? (
          <Link
            href="/predicciones"
            className="relative mt-4 inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)] hover:underline"
          >
            Ver mis picks pre-torneo <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rise-in space-y-4">
      {nextDeadline ? (
        <NextDeadlineCard
          label={nextDeadline.label}
          href={nextDeadline.href}
          closesAt={nextDeadline.closesAt}
          missing={nextDeadline.missing}
          total={nextDeadline.total}
        />
      ) : null}

      {/* Satellites: other open matchdays + bracket */}
      {openMatchdays.length > 0 || bracket ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                valueText={`${filled}/${total} partidos`}
                hintText={`Cierre ${formatShort(m.closesAt)}`}
                fraction={{ done: filled, total }}
                cta={status === "complete" ? "Revisar" : "Predecir"}
                badge={status === "not-started" ? "start" : null}
              />
            );
          })}
          {bracket && bracket.state === "open" ? (
            <CategoryCard
              icon={Trophy}
              label="Bracket eliminatorio"
              href="/predicciones/bracket"
              status={
                bracket.filled === 0
                  ? "not-started"
                  : bracket.filled >= bracket.total
                    ? "complete"
                    : "in-progress"
              }
              valueText={`${bracket.filled}/${bracket.total} slots`}
              hintText={
                bracket.closesAt
                  ? `Cierre ${formatShort(bracket.closesAt)}`
                  : "Cierra al primer dieciseisavos"
              }
              fraction={{ done: bracket.filled, total: bracket.total }}
              cta={bracket.filled >= bracket.total ? "Revisar" : "Predecir"}
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
            Ver mis picks pre-torneo · {preTorneoComplete}/{preTorneoTotal}
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
  if (kind === "groups") {
    return (
      <CategoryCard
        icon={Trophy}
        label="Grupos"
        href="/predicciones/grupos"
        status={status}
        valueText={`${groupsFilled}/${groupsTotal} grupos`}
        hintText="Quién pasa de cada grupo"
        badge={badge}
        fraction={{ done: groupsFilled, total: groupsTotal }}
        cta={status === "complete" ? "Revisar" : "Predecir"}
      />
    );
  }
  if (kind === "topscorer") {
    return (
      <CategoryCard
        icon={Crown}
        label="Bota de Oro"
        href="/predicciones/goleador-torneo"
        status={status}
        valueText={topScorerDone ? "Pick enviado" : "Sin elegir"}
        hintText="Tu candidato al máximo goleador"
        badge={badge}
        cta={status === "complete" ? "Revisar" : "Elegir"}
      />
    );
  }
  if (status === "locked") {
    return (
      <CategoryCard
        icon={Sparkles}
        label="Especiales"
        href="/predicciones/especiales"
        status="locked"
        valueText="Aún no publicadas"
        hintText="El admin las publicará en breve"
      />
    );
  }
  return (
    <CategoryCard
      icon={Sparkles}
      label="Especiales"
      href="/predicciones/especiales"
      status={status}
      valueText={`${specialsFilled}/${specialsTotal} respondidas`}
      hintText="Balón / Guante / Anfitrión…"
      badge={badge}
      fraction={{ done: specialsFilled, total: specialsTotal }}
      cta={status === "complete" ? "Revisar" : "Responder"}
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

function labelFor(kind: "groups" | "topscorer" | "specials"): string {
  if (kind === "groups") return "Grupos";
  if (kind === "topscorer") return "Bota de Oro";
  return "Especiales";
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
