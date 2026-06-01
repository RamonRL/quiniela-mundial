"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shell del modo interactivo de predicción (1 elemento por pantalla).
 * Usado por los 3 modos (grupos / jornadas / especiales). Recibe el
 * step actual del padre (controlled) más callbacks de navegación —
 * cada padre decide qué pasa al avanzar/retroceder (auto-save, etc.).
 *
 * Estructura:
 *  - Topbar sticky con título, contador (X/N) y progress bar arena.
 *  - Body central con animación slide al cambiar de step.
 *  - Footer con flechas izq/der.
 *
 * Animación: `key={currentStep}` en el wrapper del body fuerza
 * remount cada paso → la clase `.tour-slide-*` arranca su keyframe.
 *
 * El toast efímero "Guardado" se muestra cuando el padre llama
 * `flashSavedToast()` vía la ref expuesta — controlado para que el
 * padre decida cuándo confirmar persistencia.
 */
export type TourShellHandle = {
  flashSavedToast: () => void;
};

type Props = {
  title: string;
  exitHref?: string;            // default "/predicciones"
  currentStep: number;          // 0-indexed
  totalSteps: number;
  /** Devuelve true para avanzar/retroceder, false para bloquear. */
  onPrev: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  /** Dirección última del movimiento — controla qué keyframe correr. */
  direction: "left" | "right";
  /** Texto de la flecha derecha en el último paso. */
  finishLabel?: string;
  /** Para deshabilitar las flechas mientras se procesa un guardado. */
  pending?: boolean;
  /** Centra el contenido en vertical (para pasos con poca info, p. ej.
   *  Marcador y Solo Ganador) en vez de pegarlo arriba. */
  centerBody?: boolean;
  /** Pinta toast con check verde durante 1.5s. */
  ref?: React.Ref<TourShellHandle>;
  children: React.ReactNode;
};

export function InteractiveTourShell(props: Props) {
  const {
    title,
    exitHref = "/predicciones",
    currentStep,
    totalSteps,
    onPrev,
    onNext,
    direction,
    finishLabel = "Finalizar",
    pending = false,
    centerBody = false,
    children,
  } = props;

  const progressPct = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  // Toast efímero "Guardado" controlado por el padre vía window event
  // (más simple que ref-forwarding para 3 consumidores).
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const handler = () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setShowToast(false);
      // Forzar reflow para reiniciar la animación si llega otro flash
      // mientras el toast aún está en pantalla.
      requestAnimationFrame(() => {
        setShowToast(true);
        toastTimer.current = setTimeout(() => setShowToast(false), 1500);
      });
    };
    window.addEventListener("interactive-tour:saved", handler);
    return () => {
      window.removeEventListener("interactive-tour:saved", handler);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--color-bg)]">
      {/* ─── Topbar fija ─── */}
      <header className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href={exitHref}
            aria-label="Salir del modo interactivo"
            className="grid size-9 place-items-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <X className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base leading-tight tracking-tight sm:text-lg">
              {title}
            </p>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Paso {currentStep + 1} de {totalSteps}
            </p>
          </div>
          <div className="hidden sm:block">
            <span className="font-display text-2xl tabular text-[var(--color-arena)] glow-arena">
              {currentStep + 1}
              <span className="text-[var(--color-muted-foreground)]">/{totalSteps}</span>
            </span>
          </div>
        </div>
        <div className="h-1 w-full bg-[var(--color-surface-2)]">
          <div
            className="h-full bg-[var(--color-arena)] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* ─── Body central con animación slide ─── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div
          key={currentStep}
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6",
            centerBody && "justify-center",
            direction === "right" ? "tour-slide-right" : "tour-slide-left",
          )}
        >
          {children}
        </div>
      </main>

      {/* ─── Footer fijo ─── */}
      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => void onPrev()}
            disabled={isFirst || pending}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => void onNext()}
            disabled={pending}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-initial sm:px-6"
          >
            {isLast ? finishLabel : "Siguiente"}
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </footer>

      {/* ─── Toast efímero "Guardado" ─── */}
      {showToast ? (
        <div
          role="status"
          aria-live="polite"
          className="tour-save-toast pointer-events-none fixed bottom-20 left-4 z-30 inline-flex items-center gap-2 rounded-md border border-[var(--color-pitch)]/40 bg-[var(--color-bg)] px-3 py-2 shadow-[var(--shadow-elev-1)]"
        >
          <Check className="size-4 text-[var(--color-pitch)]" />
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em]">
            Guardado
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Helper para disparar el toast "Guardado" desde cualquier punto del
 * tour. El shell escucha este evento y muestra el toast 1.5s.
 */
export function flashSavedToast(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("interactive-tour:saved"));
}

/**
 * Helper para disparar un toast informativo bloqueante (foto similar al
 * de "guardado" pero amber). Lo usan los flows cuando el user intenta
 * avanzar sin completar un campo obligatorio (ej: goleador en jornadas).
 *
 * Implementación pragmática: usamos `sonner` (Toaster ya montado en el
 * root layout vía components/ui/sonner.tsx). Las llamadas desde el
 * cliente pueden importar `toast` directamente cuando lo necesiten.
 */
