"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  /** Accessible label for the score, e.g. "Goles España". */
  ariaLabel?: string;
  /** "lg" duplica el tamaño de los dígitos y de los signos -/+ (paso a paso). */
  size?: "default" | "lg";
  className?: string;
};

const SIZE = {
  default: { btn: "size-11", icon: "size-4", num: "h-11 w-12 text-2xl" },
  // El doble: dígitos ~2× (text-5xl) y signos -/+ ~2× (size-8).
  lg: { btn: "size-16", icon: "size-8", num: "h-16 min-w-16 px-2 text-5xl" },
} as const;

/**
 * Touch-friendly score stepper: `[-]  N  [+]`. Replaces the bare number input
 * in score predictions so the user can tap to bump the goals up or down
 * instead of typing a number.
 */
export function ScoreStepper({
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 20,
  ariaLabel,
  size = "default",
  className,
}: Props) {
  const s = SIZE[size];
  const dec = () => {
    if (disabled) return;
    if (value > min) onChange(value - 1);
  };
  const inc = () => {
    if (disabled) return;
    if (value < max) onChange(value + 1);
  };
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
        disabled && "opacity-60",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || atMin}
        aria-label="Restar gol"
        className={cn(
          "grid place-items-center text-[var(--color-muted-foreground)] transition",
          s.btn,
          "active:bg-[var(--color-surface-2)]",
          atMin || disabled
            ? "cursor-not-allowed opacity-40"
            : "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-arena)]",
        )}
      >
        <Minus className={s.icon} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "grid place-items-center border-x border-[var(--color-border)] bg-[var(--color-surface-2)] font-display tabular tracking-tight text-[var(--color-foreground)]",
          s.num,
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || atMax}
        aria-label="Sumar gol"
        className={cn(
          "grid place-items-center text-[var(--color-muted-foreground)] transition",
          s.btn,
          "active:bg-[var(--color-surface-2)]",
          atMax || disabled
            ? "cursor-not-allowed opacity-40"
            : "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-arena)]",
        )}
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}
