import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Lock } from "lucide-react";
import { db } from "@/lib/db";
import { matchdays, matches, predMatchResult } from "@/lib/db/schema";
import { computeMatchdayStates, type Stage } from "@/lib/matchday-state";
import { formatDateTime } from "@/lib/utils";
import { RoundsStripScroller } from "./rounds-strip-scroller";

/**
 * Slider horizontal con las próximas rondas de predicciones por
 * partido. Encaja entre el ProgressHub y los stats del dashboard
 * para que el usuario sepa de un vistazo qué jornada le toca cerrar
 * a continuación.
 *
 * Comportamiento de la ventana visible (3 cards desktop, 1 móvil):
 *  - Hasta que arranca el torneo: jornadas 1, 2 y 3 (todas open).
 *  - Mid-tournament: la ronda activa + las 2 siguientes (que pueden
 *    estar en "waiting" si dependen de que termine la anterior).
 *  - Al acercarse el final: la ventana se queda anclada a la última
 *    posición de la lista, mostrando dos rondas cerradas + la final
 *    como activa. Coincide con cómo el usuario percibe el cierre del
 *    torneo: "ya pasaron las semis, queda la final".
 *
 * El cliente (`<RoundsStripScroller />`) scrollea la ronda activa al
 * primer card visible en móvil para que el usuario nunca tenga que
 * deslizar manualmente para encontrarla.
 */

const VISIBLE_COUNT = 3;

// Claves i18n (namespace "dashboard").
const STAGE_LABEL: Record<Stage, string> = {
  group: "urStageGroup",
  r32: "urStageR32",
  r16: "urStageR16",
  qf: "urStageQf",
  sf: "urStageSf",
  third: "urStageThird",
  final: "urStageFinal",
};

export type Round = {
  id: number;
  name: string;
  stage: Stage;
  deadline: Date;
  state: "waiting" | "open" | "closed";
  reason?: string;
  total: number;
  filled: number;
};

export async function UpcomingRoundsStrip({
  userId,
  leagueId,
  timeZone,
}: {
  userId: string;
  leagueId: number;
  timeZone: string;
}) {
  const t = await getTranslations("dashboard");
  const all = await db
    .select({
      id: matchdays.id,
      name: matchdays.name,
      stage: matchdays.stage,
      predictionDeadlineAt: matchdays.predictionDeadlineAt,
    })
    .from(matchdays)
    .orderBy(asc(matchdays.orderIndex), asc(matchdays.predictionDeadlineAt));

  if (all.length === 0) return null;

  const withState = await computeMatchdayStates(
    all.map((m) => ({
      id: m.id,
      stage: m.stage as Stage,
    })),
  );
  const enriched = all.map((m, i) => ({ ...m, ...withState[i] }));

  // Algoritmo de ventana:
  // - Si hay una ronda no-cerrada, la usamos como ancla y mostramos
  //   ella + las dos siguientes.
  // - Cerca del final (menos de 2 rondas no-cerradas), desplazamos la
  //   ventana a la izquierda para que el final SIEMPRE quepa en
  //   pantalla, aunque toque mostrar rondas cerradas anteriores.
  // - Si todas están cerradas, simplemente las 3 últimas.
  const totalRounds = enriched.length;
  const visibleCount = Math.min(VISIBLE_COUNT, totalRounds);
  const activeIdx = enriched.findIndex((r) => r.state !== "closed");
  let startIdx: number;
  if (activeIdx === -1) {
    startIdx = totalRounds - visibleCount;
  } else {
    startIdx = Math.min(activeIdx, totalRounds - visibleCount);
  }
  startIdx = Math.max(0, startIdx);
  const window = enriched.slice(startIdx, startIdx + visibleCount);

  // Conteos por ronda — un par de queries agrupadas para no hacer N+1.
  const windowIds = window.map((m) => m.id);
  const [matchCountsRaw, predCountsRaw] = await Promise.all([
    db
      .select({
        matchdayId: matches.matchdayId,
        count: sql<number>`count(*)::int`,
      })
      .from(matches)
      .where(inArray(matches.matchdayId, windowIds))
      .groupBy(matches.matchdayId),
    db
      .select({
        matchdayId: matches.matchdayId,
        count: sql<number>`count(*)::int`,
      })
      .from(predMatchResult)
      .innerJoin(matches, eq(predMatchResult.matchId, matches.id))
      .where(
        and(
          eq(predMatchResult.userId, userId),
          eq(predMatchResult.leagueId, leagueId),
          inArray(matches.matchdayId, windowIds),
        ),
      )
      .groupBy(matches.matchdayId),
  ]);
  const matchCountMap = new Map(
    matchCountsRaw
      .filter((r): r is { matchdayId: number; count: number } => r.matchdayId != null)
      .map((r) => [r.matchdayId, r.count]),
  );
  const predCountMap = new Map(
    predCountsRaw
      .filter((r): r is { matchdayId: number; count: number } => r.matchdayId != null)
      .map((r) => [r.matchdayId, r.count]),
  );

  const rounds: Round[] = window.map((m) => ({
    id: m.id,
    name: m.name,
    stage: m.stage as Stage,
    deadline: m.predictionDeadlineAt,
    state: m.state,
    reason: m.reason,
    total: matchCountMap.get(m.id) ?? 0,
    filled: predCountMap.get(m.id) ?? 0,
  }));

  // Índice de la ronda "activa" dentro de la ventana — la primera open
  // (típicamente índice 0), o el último elemento si todas están closed
  // (caso post-final). Se lo pasamos al cliente para que la centre en
  // móvil al renderizar.
  let activeInWindow = rounds.findIndex((r) => r.state === "open");
  if (activeInWindow === -1) {
    activeInWindow = Math.max(0, rounds.length - 1);
  }

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("urEyebrow")}
          </p>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {t("urTitle")}
          </h2>
        </div>
      </header>
      <RoundsStripScroller activeIndex={activeInWindow}>
        {rounds.map((r) => (
          <RoundCard key={r.id} round={r} timeZone={timeZone} />
        ))}
      </RoundsStripScroller>
    </section>
  );
}

function RoundCard({ round, timeZone }: { round: Round; timeZone: string }) {
  const t = useTranslations("dashboard");
  const isOpen = round.state === "open";
  const isClosed = round.state === "closed";
  const stageText = STAGE_LABEL[round.stage] ? t(STAGE_LABEL[round.stage]) : round.stage;

  const cardBase = "flex h-full flex-col gap-2.5 rounded-xl border p-4 transition";
  const cardClass = isOpen
    ? `${cardBase} border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] hover:-translate-y-0.5 hover:border-[var(--color-arena)] hover:shadow-[var(--shadow-arena)]`
    : isClosed
      ? `${cardBase} border-[var(--color-border)] bg-[var(--color-surface-2)] opacity-50`
      : `${cardBase} border-dashed border-[var(--color-border)] bg-[var(--color-surface)] opacity-75`;

  const inner = (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {stageText}
        </span>
        {isOpen ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-arena)]/15 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
            <span className="size-1.5 rounded-full bg-[var(--color-arena)] shadow-[0_0_6px_var(--color-arena)]" />
            {t("urOpen")}
          </span>
        ) : isClosed ? (
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {t("urClosedBadge")}
          </span>
        ) : (
          <Lock className="size-3.5 text-[var(--color-muted-foreground)]" />
        )}
      </div>
      <h3 className="font-display text-lg leading-tight tracking-tight">
        {round.name}
      </h3>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        {round.total > 0
          ? t("urPredicted", { filled: round.filled, total: round.total })
          : t("urCalendarPending")}
      </p>
      <p
        className={`mt-auto font-mono text-[0.55rem] uppercase tracking-[0.18em] ${
          isOpen
            ? "text-[var(--color-arena)]"
            : "text-[var(--color-muted-foreground)]"
        }`}
      >
        {isOpen
          ? t("urCloses", {
              date: formatDateTime(round.deadline, {
                timeZone,
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })
          : isClosed
            ? t("urClosedAt", {
                date: formatDateTime(round.deadline, {
                  timeZone,
                  day: "2-digit",
                  month: "short",
                }),
              })
            : round.reason ?? t("urLocked")}
      </p>
    </article>
  );

  if (isOpen) {
    return (
      <Link
        href={`/predicciones/jornada/${round.id}`}
        className="block h-full"
        aria-label={t("urPredictAria", { name: round.name })}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
