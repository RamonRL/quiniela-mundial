"use client";

import { useEffect, useState } from "react";

/**
 * Overlay de carga de la casa — para esperas reales (guardados pesados,
 * creación de ligas, cierres de tour…), no para microinteracciones.
 *
 * Doble anillo girando en sentidos opuestos con el punto arena pulsando
 * en el centro, etiqueta mono con puntos suspensivos animados y el
 * halftone de fondo. Bloquea la interacción mientras está visible.
 *
 * Úsalo a través de `DelayedLoadingOverlay`: con un retardo de aparición
 * (~400ms) los guardados rápidos no parpadean y solo las esperas que de
 * verdad se notan enseñan el overlay.
 */
export function LoadingOverlay({
  label,
  sublabel,
}: {
  label: string;
  sublabel?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="qm-loading-overlay fixed inset-0 z-[120] grid place-items-center bg-[color-mix(in_oklch,var(--color-bg)_72%,transparent)] backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="halftone pointer-events-none absolute inset-0 opacity-[0.04]"
      />
      <div className="relative flex flex-col items-center gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-10 py-8 shadow-[var(--shadow-elev-2)]">
        <span className="relative grid size-16 place-items-center" aria-hidden>
          {/* Anillo exterior — gira en sentido horario */}
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-arena)]" />
          {/* Anillo interior — más lento y en sentido contrario */}
          <span className="absolute inset-2.5 animate-[spin_2.2s_linear_infinite_reverse] rounded-full border border-[var(--color-border)] border-b-[var(--color-arena)]/70" />
          {/* Punto central pulsando */}
          <span className="size-2 animate-pulse rounded-full bg-[var(--color-arena)] shadow-[0_0_12px_color-mix(in_oklch,var(--color-arena)_70%,transparent)]" />
        </span>
        <div className="space-y-1 text-center">
          <p className="qm-loading-dots font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-foreground)]">
            {label}
          </p>
          {sublabel ? (
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {sublabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Variante con retardo de aparición: si la espera dura menos que
 * `delayMs`, el overlay nunca llega a pintarse (cero parpadeo en
 * guardados rápidos). Si dura más, aparece con fade y se queda hasta
 * que `show` vuelva a false.
 */
export function DelayedLoadingOverlay({
  show,
  delayMs = 400,
  label,
  sublabel,
}: {
  show: boolean;
  delayMs?: number;
  label: string;
  sublabel?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [show, delayMs]);

  if (!visible) return null;
  return <LoadingOverlay label={label} sublabel={sublabel} />;
}
