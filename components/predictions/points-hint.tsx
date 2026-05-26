import { Sparkles } from "lucide-react";
import { PointsPill } from "@/components/brand/points-pill";
import { cn } from "@/lib/utils";

/**
 * Bloque visual compacto que enseña la tabla de puntuación de UN paso
 * del modo interactivo. Pensado para vivir entre el header del step y
 * el contenido editable. Reusa `PointsPill` para mantener consistencia
 * con el ScoringBox de las páginas full.
 *
 * Cada item se renderiza como `<pill> <label>` en una fila. Items
 * marcados como `bonus` salen con dashed border + indent visual.
 *
 * El componente NO maneja qué items mostrar — eso lo decide el padre
 * según contexto (en KO añade los bonuses, en grupos solo los 3 base).
 */
export type PointsHintItem = {
  points: number;
  label: string;
  prefix?: "+" | "";
  bonus?: boolean;
};

export function PointsHint({
  items,
  title = "Cuánto puntúa este paso",
  footnote,
  className,
}: {
  items: PointsHintItem[];
  title?: string;
  footnote?: string;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section
      className={cn(
        "rounded-lg border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] px-3 py-2.5",
        className,
      )}
    >
      <header className="mb-1.5 inline-flex items-center gap-1.5">
        <Sparkles className="size-3 text-[var(--color-arena)]" />
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[var(--color-arena)]">
          {title}
        </p>
      </header>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li
            key={idx}
            className={cn(
              "flex items-center gap-2",
              item.bonus && "ml-3 sm:ml-4",
            )}
          >
            <PointsPill
              points={item.points}
              prefix={item.prefix}
              variant={item.bonus ? "bonus" : "default"}
              size="sm"
            />
            <span className="text-[0.72rem] leading-snug">{item.label}</span>
          </li>
        ))}
      </ul>
      {footnote ? (
        <p className="mt-1.5 border-t border-dashed border-[var(--color-border)] pt-1.5 font-editorial text-[0.65rem] italic text-[var(--color-muted-foreground)]">
          {footnote}
        </p>
      ) : null}
    </section>
  );
}
