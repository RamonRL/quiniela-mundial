"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  /** Si true, monta el overlay full-viewport con la estética arcade. */
  active: boolean;
  /**
   * Texto a confirmar al pulsar "Abandonar" (o tecla Esc). Si no se pasa,
   * el botón abandono no aparece — útil para la fase final (`done`) donde
   * el usuario sale con "Cerrar" sin necesitar warning.
   */
  abandonConfirm?: string;
  /** Llamado tras confirmar abandono (o Esc + confirm). */
  onAbandon?: () => void;
  /** Llamado al pulsar "Cerrar" en la pantalla de resultado. */
  onClose?: () => void;
  /** Etiqueta del botón superior derecho: por defecto "Abandonar". */
  exitLabel?: string;
  children: React.ReactNode;
};

/**
 * Overlay full-viewport para los minijuegos. Aisla al jugador del resto
 * de la app (sidebar, header, ranking…) durante la partida.
 *
 * Detalles:
 * - Renderiza vía portal al body para escapar cualquier contexto de
 *   apilamiento del layout público.
 * - Bloquea scroll del body mientras está activo.
 * - Tecla Esc dispara el mismo flujo que el botón de salida (con confirm
 *   si lo hay).
 */
export function GameStage({
  active,
  abandonConfirm,
  onAbandon,
  onClose,
  exitLabel,
  children,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll mientras el stage está activo.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Esc → abandonar (o cerrar si no hay confirm).
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      handleExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, abandonConfirm, onAbandon, onClose]);

  if (!mounted || !active) return null;

  function handleExit() {
    if (onAbandon) {
      if (abandonConfirm && !window.confirm(abandonConfirm)) return;
      onAbandon();
      return;
    }
    onClose?.();
  }

  const label = exitLabel ?? (onAbandon ? "Abandonar" : "Cerrar");

  return createPortal(
    <div
      // role=dialog + aria-modal hace que lectores de pantalla traten el
      // overlay como modal y dejen el resto inerte.
      role="dialog"
      aria-modal="true"
      aria-label="Partida en curso"
      className="mj-arcade mj-scanlines mj-stage-in fixed inset-0 z-[100] overflow-y-auto"
    >
      {/* Decoración: línea de césped horizontal centro-campo */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--mj-line-strong)] opacity-40"
      />
      {/* Círculo central, sutil */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-25"
        style={{
          width: "min(60vw, 32rem)",
          height: "min(60vw, 32rem)",
          borderColor: "var(--mj-line-strong)",
        }}
      />

      {/* Botón salir · top-right */}
      <button
        type="button"
        onClick={handleExit}
        title={`${label} (Esc)`}
        className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-md border border-[var(--mj-line)] bg-[var(--mj-bg-2)]/80 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--mj-text-dim)] backdrop-blur-sm transition hover:border-[var(--mj-red)]/60 hover:text-[var(--mj-red)] sm:right-6 sm:top-6"
      >
        <X className="size-3.5" />
        {label}
      </button>

      {/* Contenido del juego, centrado, con margen para el HUD */}
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-16 sm:px-6 sm:py-20">
        {children}
      </div>
    </div>,
    document.body,
  );
}
