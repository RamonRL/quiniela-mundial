import { TeamFlag } from "@/components/brand/team-flag";

export type MatchWindowTeam = { code: string; name: string } | null;

export type MatchWindowRow = {
  /** Código de partido (M1, M2…) para la etiqueta. */
  code: string;
  home: MatchWindowTeam;
  away: MatchWindowTeam;
  state: "finished" | "live" | "upcoming";
  homeScore?: number | null;
  awayScore?: number | null;
  /** Minuto para los EN VIVO. */
  minute?: number | null;
  /** Etiqueta de hora para los upcoming (ya formateada). */
  timeLabel?: string | null;
  /** El partido del contador de la izquierda → resaltado. */
  isNext?: boolean;
};

export type MatchWindowLabels = {
  next: string; // "Próximo"
  live: string; // "En vivo"
  final: string; // "Final"
};

/**
 * Columna derecha del hero del dashboard durante el torneo: ventana de 3
 * partidos en torno al "siguiente" (anterior · siguiente · posterior, con
 * retroceso cuando no hay posterior o hay varios en vivo). Presentacional y
 * reutilizable; la lógica de qué 3 partidos mostrar vive fuera.
 */
export function MatchWindow({ rows, labels }: { rows: MatchWindowRow[]; labels: MatchWindowLabels }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <Row key={`${r.code}-${i}`} row={r} labels={labels} />
      ))}
    </div>
  );
}

function Row({ row, labels }: { row: MatchWindowRow; labels: MatchWindowLabels }) {
  const { state, isNext } = row;
  const live = state === "live";
  const finished = state === "finished";

  const winnerSide =
    finished && row.homeScore != null && row.awayScore != null
      ? row.homeScore > row.awayScore
        ? "home"
        : row.awayScore > row.homeScore
          ? "away"
          : "draw"
      : null;

  return (
    <div
      className={`rounded-xl border bg-[var(--color-surface-2)] p-3 transition ${
        isNext
          ? "border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)]"
          : live
            ? "border-[var(--color-arena)]/40"
            : "border-[var(--color-border)]"
      } ${finished ? "opacity-80" : ""}`}
    >
      {/* Cabecera: código + estado */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          {row.code}
          {isNext ? (
            <span className="ml-1.5 text-[var(--color-arena)]">· {labels.next}</span>
          ) : null}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-arena)]" />
            </span>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
              {labels.live}
              {row.minute != null ? ` · ${row.minute}'` : ""}
            </span>
          </span>
        ) : finished ? (
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {labels.final}
          </span>
        ) : (
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {row.timeLabel ?? ""}
          </span>
        )}
      </div>

      {/* Equipos + marcador / vs */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Side team={row.home} align="start" dim={winnerSide === "away"} />
        <span
          className={`font-display tabular text-lg leading-none ${
            live ? "text-[var(--color-arena)] glow-arena" : ""
          }`}
        >
          {finished || live ? (
            <>
              {row.homeScore ?? 0}
              <span className="mx-0.5 text-[var(--color-muted-foreground)] opacity-60">·</span>
              {row.awayScore ?? 0}
            </>
          ) : (
            <span className="text-sm text-[var(--color-muted-foreground)]">vs</span>
          )}
        </span>
        <Side team={row.away} align="end" dim={winnerSide === "home"} />
      </div>
    </div>
  );
}

function Side({
  team,
  align,
  dim,
}: {
  team: MatchWindowTeam;
  align: "start" | "end";
  dim: boolean;
}) {
  const flip = align === "end" ? "flex-row-reverse text-right" : "";
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${flip} ${dim ? "text-[var(--color-muted-foreground)]" : ""}`}>
      <TeamFlag code={team?.code} size={18} />
      <span className="truncate text-xs font-medium">{team?.name ?? "TBD"}</span>
    </span>
  );
}
