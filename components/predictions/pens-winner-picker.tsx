"use client";

import { TeamFlag } from "@/components/brand/team-flag";
import { cn } from "@/lib/utils";

/**
 * Selector de quién pasa la tanda de penaltis, compartido por TODOS los modos
 * (Solo Ganador, Marcador y Completo). Aparece automáticamente cuando, en una
 * ronda eliminatoria, la predicción es un EMPATE — porque un KO no puede acabar
 * en tablas: a 120′ empatado, lo decide la tanda. Reemplaza al antiguo checkbox
 * "se va a penaltis" + desplegable de Marcador/Completo por los mismos botones
 * con bandera de Solo Ganador.
 */

export type PensTeam = { id: number; code: string; name: string };

export function PensWinnerPicker({
  home,
  away,
  winnerTeamId,
  onPick,
  disabled = false,
  flagSize = 18,
}: {
  home: PensTeam | null;
  away: PensTeam | null;
  winnerTeamId: number | null;
  onPick: (teamId: number) => void;
  disabled?: boolean;
  flagSize?: number;
}) {
  return (
    <div className="rise-in space-y-2 rounded-lg border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface-2))] p-2.5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-arena)]">
        ¿Quién pasa en penaltis? <span className="text-[var(--color-muted-foreground)]">+2</span>
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {[home, away].map((team) =>
          team ? (
            <button
              key={team.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(team.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition disabled:opacity-50",
                winnerTeamId === team.id
                  ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] text-[var(--color-foreground)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:border-[var(--color-arena)]/40",
              )}
            >
              <TeamFlag code={team.code} size={flagSize} />
              <span className="truncate">{team.name}</span>
            </button>
          ) : null,
        )}
      </div>
    </div>
  );
}
