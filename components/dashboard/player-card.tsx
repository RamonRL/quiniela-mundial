import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Crown, Target, Footprints } from "lucide-react";
import { initials } from "@/lib/utils";

export type PlayerCardLabels = {
  eyebrow: string;
  position: string;
  of: string; // "de {n}" sin formatear → lo formatea el caller
  points: string;
  exact: string;
  pending: string;
  noRank: string;
  view: string;
};

/**
 * Card de jugador del dashboard: identidad + cómo va en ESTA quiniela en un
 * solo elemento visual (apodo, foto, posición, puntos, exactos, goleadores
 * pendientes). Lenguaje de retransmisión: fondo de estadio (spotlight +
 * halftone), número de puntos protagonista con glow arena. Va justo debajo de
 * la card principal. Toda la card enlaza al perfil del usuario.
 */
export function DashboardPlayerCard({
  userId,
  display,
  avatarUrl,
  position,
  points,
  exactScores,
  pendingScorers,
  labels,
}: {
  userId: string;
  display: string;
  avatarUrl: string | null;
  position: number | null;
  points: number;
  exactScores: number;
  pendingScorers: number;
  labels: PlayerCardLabels;
}) {
  const isLeader = position === 1;
  return (
    <Link
      href={`/ranking/${userId}`}
      aria-label={labels.view}
      className="rise-in group relative block overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[var(--color-surface)] shadow-[var(--shadow-arena)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
    >
      {/* Fondo de estadio */}
      <div aria-hidden className="spotlight pointer-events-none absolute inset-0 opacity-60" />
      <div aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" />

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {/* Identidad: avatar + apodo + chips */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="size-16 border-2 border-[var(--color-arena)]/50 shadow-[var(--shadow-arena)] sm:size-20">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-[var(--color-surface-2)] font-display text-xl">
                {initials(display)}
              </AvatarFallback>
            </Avatar>
            {/* Chip de rango sobre el avatar */}
            <span
              className={`absolute -bottom-1.5 -right-1.5 grid min-w-7 place-items-center rounded-full border-2 border-[var(--color-surface)] px-1.5 py-0.5 font-display tabular text-xs leading-none ${
                isLeader
                  ? "bg-[var(--color-arena)] text-white glow-arena"
                  : position != null
                    ? "bg-[var(--color-surface-2)] text-[var(--color-arena)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
              }`}
            >
              {isLeader ? <Crown className="size-3.5" /> : position != null ? `#${position}` : "—"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {labels.eyebrow}
            </p>
            <p className="truncate font-display text-2xl leading-tight tracking-tight sm:text-3xl">
              {display}
            </p>
            {/* Chips: posición · exactos · goleadores pendientes */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              <span className="inline-flex items-center gap-1">
                {labels.position}
                <span className="font-display tabular text-sm normal-case tracking-normal text-[var(--color-arena)]">
                  {position != null ? `#${position}` : "—"}
                </span>
                {position != null ? (
                  <span className="normal-case">{labels.of}</span>
                ) : (
                  <span className="normal-case lowercase">· {labels.noRank}</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1">
                <Target className="size-3 text-[var(--color-arena)]" />
                <span className="font-display tabular text-sm normal-case text-[var(--color-foreground)]">
                  {exactScores}
                </span>
                {labels.exact}
              </span>
              <span className="inline-flex items-center gap-1">
                <Footprints className="size-3 text-[var(--color-arena)]" />
                <span className="font-display tabular text-sm normal-case text-[var(--color-foreground)]">
                  {pendingScorers}
                </span>
                {labels.pending}
              </span>
            </div>
          </div>
        </div>

        {/* Puntos protagonista */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-dashed border-[var(--color-border)] pt-4 sm:flex-col sm:items-end sm:justify-center sm:gap-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display tabular text-5xl leading-none tracking-tighter text-[var(--color-arena)] glow-arena sm:text-6xl">
              {points}
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {labels.points}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-arena)] transition group-hover:translate-x-0.5">
            {labels.view} <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
