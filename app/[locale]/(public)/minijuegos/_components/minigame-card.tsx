import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MinigameDef } from "../_lib/games";

type Props = {
  game: MinigameDef;
  myBestScore?: number | null;
  totalParticipants?: number;
};

/**
 * Tarjeta "cabinet" para cada minijuego en el lobby. Punto verde LED para
 * marcar disponibilidad, marcador con la mejor puntuación, CTA en mono
 * uppercase imitando un botón de máquina arcade.
 */
export function MinigameCard({ game, myBestScore, totalParticipants }: Props) {
  const Icon = game.icon;
  const soon = game.status === "soon";

  const Inner = (
    <>
      {/* Línea decorativa verde superior */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          soon
            ? "bg-[var(--color-border)]"
            : "bg-gradient-to-r from-transparent via-[var(--color-pitch)] to-transparent",
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="grid size-14 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <Icon
            className={cn(
              "size-7",
              soon ? "text-[var(--color-muted-foreground)]" : "text-[var(--color-pitch)]",
            )}
          />
        </div>
        {soon ? (
          <span className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            <Clock className="size-3" />
            Próximamente
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-pitch)]/40 bg-[color-mix(in_oklch,var(--color-pitch)_6%,transparent)] px-2.5 py-0.5">
            <span className="size-1.5 rounded-full bg-[var(--color-pitch)] mj-led-blink" />
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-pitch)]">
              Online
            </span>
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {game.tagline}
        </p>
        <h3 className="font-display text-3xl tracking-tight">{game.name}</h3>
        <p className="font-editorial text-sm italic leading-snug text-[var(--color-muted-foreground)]">
          {game.description}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 items-end gap-3 pt-3">
        <div className="space-y-0.5">
          {myBestScore != null ? (
            <>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Tu mejor
              </p>
              <p className="font-display text-2xl tabular text-[var(--color-pitch)] glow-pitch">
                {myBestScore}
              </p>
            </>
          ) : totalParticipants != null && totalParticipants > 0 ? (
            <>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Jugadores
              </p>
              <p className="font-display text-2xl tabular">{totalParticipants}</p>
            </>
          ) : null}
        </div>
        {!soon ? (
          <span className="inline-flex items-center justify-end gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--color-pitch)]">
            <Play className="size-3.5" />
            Jugar
          </span>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    "relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border bg-[var(--color-surface)] p-5 transition-all",
    soon
      ? "border-dashed border-[var(--color-border)] opacity-70"
      : "border-[var(--color-border)] hover:-translate-y-0.5 hover:border-[var(--color-pitch)]/60 hover:shadow-[var(--shadow-pitch)]",
  );

  if (soon) {
    return (
      <div aria-disabled className={className}>
        {Inner}
      </div>
    );
  }
  return (
    <Link href={`/minijuegos/${game.slug}`} className={cn(className, "group")}>
      {Inner}
    </Link>
  );
}
