"use client";

import { TeamFlag } from "@/components/brand/team-flag";
import { cn } from "@/lib/utils";
import { PensWinnerPicker } from "@/components/predictions/pens-winner-picker";

/**
 * Selector 1·X·2 del modo Solo Ganador — la quiniela clásica. Codifica la
 * elección en el marcador canónico (local 1-0 · empate 0-0 · visitante 0-1)
 * y usa `picked` para distinguir un empate elegido del 0-0 inicial. En
 * eliminatoria el empate significa "va a penaltis" y despliega el
 * sub-selector de quién gana la tanda (→ winnerTeamId).
 *
 * Lo comparten la vista de tarjeta (formulario full de la jornada) y el modo
 * paso a paso (tour), con dos `variant` de tamaño: "card" compacto y "tour"
 * a pantalla completa centrado.
 */

export type WinnerTeam = { id: number; code: string; name: string };

export type WinnerValue = {
  homeScore: number;
  awayScore: number;
  willGoToPens: boolean;
  winnerTeamId: number | null;
  picked: boolean;
};

export type Outcome = "home" | "draw" | "away";

type Variant = "card" | "tour";

const SIZES: Record<
  Variant,
  {
    flag: number;
    glyph: string;
    name: string;
    cell: string;
    digit: string;
    sub: string;
    pensFlag: number;
    gap: string;
  }
> = {
  card: {
    flag: 30,
    glyph: "size-7 text-base",
    name: "text-sm",
    cell: "px-1 py-2.5",
    digit: "text-2xl",
    sub: "text-[0.5rem] tracking-[0.16em]",
    pensFlag: 16,
    gap: "gap-1.5",
  },
  tour: {
    flag: 46,
    glyph: "size-11 text-2xl",
    name: "text-base sm:text-xl",
    cell: "px-2 py-5",
    digit: "text-4xl sm:text-5xl",
    sub: "text-[0.6rem] tracking-[0.18em]",
    pensFlag: 20,
    gap: "gap-2 sm:gap-3",
  },
};

export function WinnerPicker({
  home,
  away,
  value,
  isKnockout,
  disabled = false,
  variant = "card",
  onChange,
}: {
  home: WinnerTeam | null;
  away: WinnerTeam | null;
  value: WinnerValue;
  isKnockout: boolean;
  disabled?: boolean;
  variant?: Variant;
  onChange: (patch: Partial<WinnerValue>) => void;
}) {
  const s = SIZES[variant];
  const outcome: Outcome =
    value.homeScore > value.awayScore
      ? "home"
      : value.homeScore < value.awayScore
        ? "away"
        : "draw";
  const sel: Outcome | null = value.picked ? outcome : null;

  const pick = (o: Outcome) => {
    if (o === "home")
      onChange({ picked: true, homeScore: 1, awayScore: 0, willGoToPens: false, winnerTeamId: isKnockout ? home?.id ?? null : null });
    else if (o === "away")
      onChange({ picked: true, homeScore: 0, awayScore: 1, willGoToPens: false, winnerTeamId: isKnockout ? away?.id ?? null : null });
    else
      onChange({ picked: true, homeScore: 0, awayScore: 0, willGoToPens: isKnockout, winnerTeamId: null });
  };

  return (
    <div className={variant === "tour" ? "space-y-5" : "space-y-3"}>
      {/* Cartel del enfrentamiento — el ganador previsto se ilumina, el otro
          se apaga; el empate deja a ambos a la par. */}
      <div className={cn("grid grid-cols-[1fr_auto_1fr] items-center", s.gap)}>
        <TeamPole
          team={home}
          align="start"
          flagSize={s.flag}
          nameClass={s.name}
          state={sel == null ? "idle" : sel === "home" ? "win" : sel === "draw" ? "tie" : "lose"}
        />
        <PickGlyph sel={sel} glyphClass={s.glyph} />
        <TeamPole
          team={away}
          align="end"
          flagSize={s.flag}
          nameClass={s.name}
          state={sel == null ? "idle" : sel === "away" ? "win" : sel === "draw" ? "tie" : "lose"}
        />
      </div>

      {/* 1·X·2 — el corazón de la quiniela */}
      <div className={cn("grid grid-cols-3", s.gap)}>
        <PickCell
          digit="1"
          sub={`Gana ${home?.code ?? "Local"}`}
          active={sel === "home"}
          disabled={disabled}
          cellClass={s.cell}
          digitClass={s.digit}
          subClass={s.sub}
          onClick={() => pick("home")}
        />
        <PickCell
          digit="X"
          sub={isKnockout ? "Empate · pen." : "Empate"}
          active={sel === "draw"}
          disabled={disabled}
          cellClass={s.cell}
          digitClass={s.digit}
          subClass={s.sub}
          onClick={() => pick("draw")}
        />
        <PickCell
          digit="2"
          sub={`Gana ${away?.code ?? "Visit."}`}
          active={sel === "away"}
          disabled={disabled}
          cellClass={s.cell}
          digitClass={s.digit}
          subClass={s.sub}
          onClick={() => pick("away")}
        />
      </div>

      {/* Eliminatoria + empate → quién pasa en la tanda de penaltis */}
      {isKnockout && sel === "draw" ? (
        <PensWinnerPicker
          home={home}
          away={away}
          winnerTeamId={value.winnerTeamId}
          disabled={disabled}
          flagSize={s.pensFlag}
          onPick={(teamId) => onChange({ picked: true, winnerTeamId: teamId })}
        />
      ) : null}
    </div>
  );
}

/** Lado del cartel: bandera + nombre, con estados ganador / empate / perdedor. */
function TeamPole({
  team,
  align,
  state,
  flagSize,
  nameClass,
}: {
  team: WinnerTeam | null;
  align: "start" | "end";
  state: "idle" | "win" | "tie" | "lose";
  flagSize: number;
  nameClass: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 transition-all duration-200",
        align === "end" && "flex-row-reverse text-right",
        state === "lose" && "opacity-35 saturate-50",
      )}
    >
      <span
        className={cn(
          // inline-flex + leading-none → la caja del wrapper mide exactamente
          // lo que la bandera (sin el hueco de baseline), así el anillo de
          // "seleccionado" queda pegado al borde y no sobra espacio.
          "inline-flex shrink-0 rounded-full leading-none transition-all duration-200",
          state === "win" && "ring-2 ring-[var(--color-arena)]",
        )}
      >
        <TeamFlag code={team?.code} size={flagSize} />
      </span>
      <span
        className={cn(
          "truncate font-display tracking-tight transition-colors",
          nameClass,
          state === "win"
            ? "text-[var(--color-arena)]"
            : "text-[var(--color-foreground)]",
        )}
      >
        {team?.name ?? "—"}
      </span>
    </div>
  );
}

/** Insignia central que refleja la elección: 1 / X / 2, o un punto si nada. */
function PickGlyph({ sel, glyphClass }: { sel: Outcome | null; glyphClass: string }) {
  const glyph = sel === "home" ? "1" : sel === "away" ? "2" : sel === "draw" ? "X" : "·";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md font-display leading-none transition-all duration-200",
        glyphClass,
        sel == null
          ? "border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)]"
          : "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]",
      )}
      aria-hidden
    >
      {glyph}
    </span>
  );
}

/** Celda 1 / X / 2 — dígito grande + etiqueta. Estado activo con acento. */
function PickCell({
  digit,
  sub,
  active,
  disabled,
  cellClass,
  digitClass,
  subClass,
  onClick,
}: {
  digit: string;
  sub: string;
  active: boolean;
  disabled: boolean;
  cellClass: string;
  digitClass: string;
  subClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col items-center gap-0.5 overflow-hidden rounded-lg border transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        cellClass,
        active
          ? "-translate-y-0.5 border-[var(--color-arena)] bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] hover:-translate-y-0.5 hover:border-[var(--color-arena)]/50 hover:text-[var(--color-foreground)]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.12]"
        />
      ) : null}
      <span className={cn("relative font-display leading-none tracking-tight", digitClass)}>
        {digit}
      </span>
      <span className={cn("relative max-w-full truncate font-mono uppercase", subClass)}>
        {sub}
      </span>
    </button>
  );
}
