import { cn } from "@/lib/utils";

/**
 * Pill numérica para mostrar "X pts" / "+X pts" de forma consistente
 * por toda la app: en el ScoringBox de cada categoría, en los hints
 * del modo interactivo y junto a los selectores de especiales.
 *
 * Tres variantes visuales:
 *  - default: arena sólido con glow — para puntos base.
 *  - bonus: arena con borde punteado y fondo tenue — bonus apilables.
 *  - subtle: monocromo gris suave — para mostrar máximos teóricos o
 *    valores de contexto que no son la cifra principal.
 *
 * Dos tamaños — `md` para listas y headings, `sm` para hints inline.
 */
export type PointsPillVariant = "default" | "bonus" | "subtle";

export function PointsPill({
  points,
  prefix,
  variant = "default",
  size = "md",
  label,
  className,
}: {
  points: number;
  /** Prefijo manual; por defecto "+" para bonus, "" para el resto. */
  prefix?: "+" | "";
  variant?: PointsPillVariant;
  size?: "sm" | "md";
  /** Sufijo opcional ("pt" / "pts" / "max"). */
  label?: string;
  className?: string;
}) {
  const sign = prefix !== undefined ? prefix : variant === "bonus" ? "+" : "";

  const sizeClasses =
    size === "sm"
      ? "min-w-[1.75rem] px-1.5 py-0.5 text-[0.7rem]"
      : "min-w-[2rem] px-1.5 py-1 text-sm";

  const variantClasses =
    variant === "bonus"
      ? "border border-dashed border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] text-[var(--color-arena)]"
      : variant === "subtle"
        ? "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
        : "border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)] glow-arena";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline justify-center gap-0 rounded font-display tabular leading-none",
        sizeClasses,
        variantClasses,
        className,
      )}
    >
      {sign ? <span className="text-[0.65rem] opacity-70">{sign}</span> : null}
      <span>{points}</span>
      {label ? (
        <span className="ml-0.5 text-[0.55rem] uppercase tracking-[0.18em] opacity-70">
          {label}
        </span>
      ) : null}
    </span>
  );
}
