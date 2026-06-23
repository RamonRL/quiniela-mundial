"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STAGE_LABEL_KEY, type HeroMatch, type HeroTeam } from "./hero-card";
import { TeamFlag } from "@/components/brand/team-flag";

/**
 * Marcador de retransmisión para un partido EN DIRECTO. Marcador grande con
 * glow, punto pulsante + minuto y chips de goleadores. `compact` reduce los
 * tamaños para el caso de dos directos en paralelo. Los nombres abrazan el
 * marcador (banderas al exterior) para aprovechar el espacio.
 */
export function LiveScoreboard({ match, compact }: { match: HeroMatch; compact?: boolean }) {
  const t = useTranslations("hero");
  const { home, away, homeScore, awayScore, minute, phase, scorers, href } = match;
  // HT (descanso) y BT (pausa antes/entre prórroga) → "Descanso" en vez del minuto.
  const isBreak = phase === "HT" || phase === "BT";
  // SUSP/INT: partido detenido por el árbitro (p. ej. temporal). El minuto queda
  // pausado en BD; mostramos "Suspendido" en su lugar.
  const isSuspended = phase === "SUSP" || phase === "INT";
  const label = match.group
    ? t("group", { g: match.group })
    : match.stage && STAGE_LABEL_KEY[match.stage]
      ? t(STAGE_LABEL_KEY[match.stage])
      : "";
  const flag = compact ? 40 : 56;

  const body = (
    <div className="flex flex-col gap-3">
      {/* Eyebrow: En vivo · ronda/grupo · minuto */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
            {t("live")}
          </span>
        </span>
        {label ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            {label}
          </span>
        ) : null}
        {isSuspended ? (
          <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-warning)]">
            {t("suspended")}
          </span>
        ) : isBreak ? (
          <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-arena)]">
            {t("halftime")}
          </span>
        ) : minute != null ? (
          <span className="ml-auto font-display tabular text-xl leading-none text-[var(--color-arena)] glow-arena sm:text-2xl">
            {minute}
            <span className="text-sm">′</span>
          </span>
        ) : null}
      </div>

      {/* Marcador — nombres abrazan el resultado. Cada lado ocupa media card
          (flex-1) para que el marcador quede centrado y simétrico. */}
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        <Side team={home} align="start" flag={flag} compact={compact} />
        <span
          className={`shrink-0 font-display tabular leading-none tracking-tighter text-[var(--color-arena)] glow-arena ${
            compact ? "text-5xl" : "text-6xl sm:text-7xl"
          }`}
        >
          {homeScore ?? 0}
          <span className="mx-1 text-[var(--color-muted-foreground)] opacity-50 sm:mx-2">·</span>
          {awayScore ?? 0}
        </span>
        <Side team={away} align="end" flag={flag} compact={compact} />
      </div>

      {/* Goleadores */}
      {scorers && scorers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-[var(--color-arena)]/25 pt-2.5">
          {scorers.map((s, i) => (
            <span
              key={`${s.name}-${i}`}
              className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs"
            >
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                {s.teamCode}
              </span>
              <span className="font-medium">{s.name}</span>
              {s.minute != null ? (
                <span className="font-mono text-[0.6rem] text-[var(--color-muted-foreground)]">
                  {s.minute}′{s.isPenalty ? " (p)" : ""}{s.isOwnGoal ? " (p.p.)" : ""}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      aria-label={`${home?.name ?? "TBD"} vs ${away?.name ?? "TBD"}`}
      className="group block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
    >
      {body}
    </Link>
  );
}

function Side({
  team,
  align,
  flag,
  compact,
}: {
  team: HeroTeam;
  align: "start" | "end";
  flag: number;
  compact?: boolean;
}) {
  const nameCls = `text-balance break-words font-display tracking-tight leading-[1.05] transition-colors group-hover:text-[var(--color-arena)] ${
    compact ? "text-xl" : "text-2xl sm:text-4xl"
  }`;
  const nameBlock = (
    <span className={`block min-w-0 ${align === "start" ? "text-right" : "text-left"}`}>
      <span className={nameCls}>{team?.name ?? "TBD"}</span>
    </span>
  );
  const flagEl = <TeamFlag code={team?.code} size={flag} className="shrink-0" />;
  return (
    <span
      className={`flex min-w-0 flex-1 items-center gap-2.5 ${
        align === "start" ? "justify-end" : "justify-start"
      }`}
    >
      {align === "start" ? (
        <>
          {flagEl}
          {nameBlock}
        </>
      ) : (
        <>
          {nameBlock}
          {flagEl}
        </>
      )}
    </span>
  );
}
