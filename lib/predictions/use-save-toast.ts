"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { renderSaveToast } from "./save-toast-render";

type State = { ok: boolean; error?: string };

type Copy = {
  successTitle: string;
  successDescription: string;
};

/**
 * Hook que centraliza el feedback de éxito / error de un Server Action
 * de predicción usando Sonner.
 *
 * - Cuando `state.ok` pasa a true, dispara `toast.custom` con un card
 *   estilizado al lenguaje del sitio (font-display, color arena, icono
 *   CheckCircle2). Auto-dismiss a 4s.
 * - Cuando `state.error` viene con texto, dispara `toast.error`.
 *
 * Usa una ref para detectar transiciones reales (de false→true / null→str)
 * y evitar disparar toasts en cada re-render. Cada `state` que vuelve
 * del Server Action es una identidad nueva, así que comparamos por
 * contenido relevante.
 */
export function usePredictionSaveToast(state: State, copy: Copy) {
  const lastOkRef = useRef(state.ok);
  const lastErrorRef = useRef(state.error);

  useEffect(() => {
    if (state.ok && !lastOkRef.current) {
      toast.custom((id) => renderSaveToast(id, copy));
    }
    lastOkRef.current = state.ok;
  }, [state.ok, copy]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      toast.error(state.error, { duration: 5000 });
    }
    lastErrorRef.current = state.error;
  }, [state.error]);
}
