"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { changeLeagueMode, type LeagueFormState } from "@/lib/league-actions";
import {
  PREDICTION_MODES,
  PREDICTION_MODE_META,
  type PredictionMode,
} from "@/lib/prediction-modes";

const initialState: LeagueFormState = { ok: false };

type Props = {
  league: {
    id: number;
    predictionMode: PredictionMode;
  };
};

/**
 * Form para que admin cambie el modo de predicción de una liga privada ya
 * creada (típicamente a petición del cliente). Muestra la descripción del
 * modo seleccionado y avisa de que el cambio afecta a qué categorías ven
 * los participantes.
 */
export function LeagueModeForm({ league }: Props) {
  const [state, action, pending] = useActionState(changeLeagueMode, initialState);
  const [mode, setMode] = useState<PredictionMode>(league.predictionMode);

  const changed = mode !== league.predictionMode;

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <input type="hidden" name="id" value={league.id} />
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg tracking-tight">Modo de juego</h3>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Actual · {PREDICTION_MODE_META[league.predictionMode].label}
        </span>
      </header>

      <label className="block space-y-1.5">
        <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          Modo
        </span>
        <select
          name="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as PredictionMode)}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-arena)]"
        >
          {PREDICTION_MODES.map((m) => (
            <option key={m} value={m}>
              {PREDICTION_MODE_META[m].label}
            </option>
          ))}
        </select>
      </label>

      <p className="text-sm text-[var(--color-muted-foreground)]">
        {PREDICTION_MODE_META[mode].description}
      </p>

      {changed ? (
        <p className="rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
          Cambia las categorías que ven los participantes y el ranking global
          en el que compite la liga. Si el torneo ya tiene resultados cargados,
          los puntos de categorías que el nuevo modo oculta seguirán contando
          hasta el próximo recálculo.
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm text-[var(--color-success)]">{state.message}</p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={pending || !changed}>
          {pending ? "Guardando…" : "Cambiar modo"}
        </Button>
      </div>
    </form>
  );
}
