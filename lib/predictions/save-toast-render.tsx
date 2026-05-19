"use client";

import { CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

type Copy = {
  successTitle: string;
  successDescription: string;
};

/**
 * JSX del toast de éxito, separado del hook porque ese vive en un
 * fichero `.ts` puro (sin JSX). Diseño 100% alineado al sitio:
 * - Borde y fondo en variables de tema.
 * - Icono de chequeo en `--color-arena` con halo `ping` sutil para que
 *   "celebre" el guardado sin gritar.
 * - Título en font-display uppercase tracking-[0.18em].
 * - Descripción en font-editorial italic (consistente con descripciones
 *   editoriales de la app, ahora con Mona Sans).
 * - Botón X minimalista para cerrar manualmente si quieres.
 */
export function renderSaveToast(id: string | number, copy: Copy) {
  return (
    <div className="halftone-bg pointer-events-auto flex w-[min(420px,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-[var(--color-arena)]/40 bg-[var(--color-surface)] p-4 shadow-[var(--shadow-elev-2)]">
      <span
        aria-hidden
        className="relative mt-0.5 grid size-7 shrink-0 place-items-center"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-arena)]/20" />
        <CheckCircle2 className="relative size-6 text-[var(--color-arena)]" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-display text-sm uppercase tracking-[0.18em]">
          {copy.successTitle}
        </p>
        <p className="font-editorial italic leading-snug text-[var(--color-muted-foreground)]">
          {copy.successDescription}
        </p>
      </div>

      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        aria-label="Cerrar"
        className="grid size-6 shrink-0 place-items-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
