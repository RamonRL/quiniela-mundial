import { Megaphone, X } from "lucide-react";

/**
 * Banda visual del ANUNCIO FIJADO de una liga (feature premium). Presentacional
 * puro — sin estado ni efectos — para poder reutilizarla tal cual en:
 *   - la barra global del layout (con `onDismiss`, descartable), y
 *   - la vista previa en vivo del editor del owner (sin `onDismiss`).
 *
 * Diseño: banda a sangre con acento de marca (arena), badge de megáfono
 * "fijado" con halo, eyebrow "ANUNCIO · {liga}" y el mensaje en tipografía
 * editorial para que se lea como una nota oficial, no como un toast cutre.
 */
export function AnnouncementBanner({
  leagueName,
  message,
  label,
  onDismiss,
  dismissLabel,
}: {
  leagueName: string;
  message: string;
  /** Etiqueta localizada, p. ej. "Anuncio". */
  label: string;
  /** Si se pasa, muestra el botón de descartar. */
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden border-y border-[var(--color-arena)]/35 bg-[color-mix(in_oklch,var(--color-arena)_11%,var(--color-surface))]">
      {/* textura halftone + foco lateral, muy sutil */}
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,color-mix(in_oklch,var(--color-arena)_18%,transparent),transparent_62%)]"
      />
      {/* franja de acento a la izquierda */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--color-arena)]" />

      <div className="relative mx-auto flex w-full max-w-6xl items-center gap-3.5 px-4 py-3.5 sm:gap-4 lg:px-8">
        {/* badge megáfono con halo pulsante */}
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-[var(--color-arena)] opacity-30 [animation-duration:2.5s]"
          />
          <Megaphone className="relative size-[1.05rem]" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.34em] text-[var(--color-arena)]">
            <span className="glow-arena">{label}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="text-[var(--color-muted-foreground)]">{leagueName}</span>
          </p>
          <p className="mt-0.5 whitespace-pre-line font-editorial text-[0.95rem] leading-relaxed text-[var(--color-foreground)] sm:text-base">
            {message}
          </p>
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel ?? "Dismiss"}
            className="grid size-7 shrink-0 place-items-center self-start rounded-full text-[var(--color-muted-foreground)] transition hover:bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] hover:text-[var(--color-foreground)]"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
