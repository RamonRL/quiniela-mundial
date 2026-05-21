"use client";

import { BookOpen } from "lucide-react";
import { useTutorial } from "./tutorial-provider";

/**
 * Botón "Ver tutorial" en el header de /predicciones. Permite re-disparar
 * la secuencia para usuarios que ya la vieron una vez (o que la saltaron).
 * NO toca `tutorialCompletedAt` — replay puro de UI.
 */
export function TutorialReplayButton() {
  const { start } = useTutorial();
  return (
    <button
      type="button"
      onClick={start}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-arena)]"
    >
      <BookOpen className="size-3.5" />
      Ver tutorial
    </button>
  );
}
