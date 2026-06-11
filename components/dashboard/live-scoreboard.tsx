import { TeamFlag } from "@/components/brand/team-flag";
import { roundOrGroupLabel, type HeroMatch, type HeroTeam } from "./hero-card";

/**
 * Marcador de retransmisión para un partido EN DIRECTO. Marcador grande con
 * glow, punto pulsante + minuto y chips de goleadores. `compact` reduce los
 * tamaños para el caso de dos directos en paralelo. Los nombres abrazan el
 * marcador (banderas al exterior) para aprovechar el espacio.
 */
export function LiveScoreboard({ match, compact }: { match: HeroMatch; compact?: boolean }) {
  const { home, away, homeScore, awayScore, minute, scorers } = match;
  const label = roundOrGroupLabel(match);
  const flag = compact ? 40 : 56;

  return (
    <div className="flex flex-col gap-3">
      {/* Eyebrow: En vivo · ronda/grupo · minuto */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
            En vivo
          </span>
        </span>
        {label ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            {label}
          </span>
        ) : null}
        {minute != null ? (
          <span className="ml-auto font-display tabular text-xl leading-none text-[var(--color-arena)] glow-arena sm:text-2xl">
            {minute}
            <span className="text-sm">′</span>
          </span>
        ) : null}
      </div>

      {/* Marcador — nombres abrazan el resultado */}
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
  const nameCls = `text-balance break-words font-display tracking-tight leading-[1.05] ${
    compact ? "text-xl" : "text-2xl sm:text-4xl"
  }`;
  const nameBlock = (
    <span className={`min-w-0 ${align === "start" ? "text-right" : "text-left"}`}>
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
