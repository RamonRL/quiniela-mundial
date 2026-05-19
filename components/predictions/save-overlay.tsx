"use client";

import { Loader2 } from "lucide-react";

type Props = {
  /** Si true, renderiza el overlay full-screen. */
  open: boolean;
  /** Copy del card centrado. Por defecto "Guardando tu predicción". */
  label?: string;
};

/**
 * Overlay full-screen que aparece mientras un Server Action está
 * pending. Bloquea visualmente la interacción con el formulario y
 * comunica al usuario que la app está trabajando.
 *
 * Implementación intencionalmente barata: un `fixed inset-0` con
 * `z-50` y backdrop-blur encima de todo, sin Radix Dialog para no
 * heredar focus-trap (los formularios padres tienen sus propios
 * states activos y el focus-trap del Dialog podía robar el foco).
 * El simple hecho de capturar los clicks con `pointer-events-auto`
 * basta para impedir que el usuario siga interactuando.
 *
 * a11y: `role="alert"` + `aria-live="assertive"` para anunciar el
 * cambio a screen-readers; `aria-busy="true"` para semántica WAI-ARIA.
 */
export function SaveOverlay({
  open,
  label = "Guardando tu predicción",
}: Props) {
  if (!open) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm"
    >
      <div className="halftone-bg flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-10 py-8 shadow-[var(--shadow-elev-2)]">
        <span
          aria-hidden
          className="relative grid size-14 place-items-center"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-arena)]/15" />
          <Loader2 className="size-10 animate-spin text-[var(--color-arena)]" />
        </span>
        <p className="font-display text-lg tracking-tight">{label}</p>
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          No cierres la página
        </p>
      </div>
    </div>
  );
}
