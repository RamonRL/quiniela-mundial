import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PointsPill } from "./points-pill";

export type ScoringRule = {
  points: number;
  /**
   * Prefix shown next to the number. Defaults to "+" when `bonus` is true,
   * empty string otherwise.
   */
  prefix?: "+" | "";
  /** Short description that explains when the user earns this. */
  label: string;
  /** Render the pill in arena (muted) styling — for bonuses and stacked extras. */
  bonus?: boolean;
  /** Ejemplo corto opcional para la columna "Ejemplo" de la tabla. */
  example?: string;
};

export type ScoringSection = {
  heading?: string;
  rules: ScoringRule[];
};

type Props = {
  /** Optional title rendered in the eyebrow. Defaults to "Cómo se puntúa". */
  title?: string;
  sections: ScoringSection[];
  /** Compact rendering for hub cards — smaller pills, tighter spacing. */
  dense?: boolean;
  /** Footer note (e.g. "Máximo 12 pts por grupo"). */
  footnote?: string;
  /** Whether the box renders open by default. Defaults to false (closed). */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Collapsible breakdown of the scoring rules for a category. Closed by
 * default — clicking the header expands a scrollable body that lists each
 * rule as `[N pts] · description`.
 *
 * Refactor visual (mayo 2026): el número manda. La pill pasa de pequeña
 * y aplastada a un bloque de 56×56 a la izquierda de cada fila, con la
 * unidad ("pts" / "+pts") debajo. La descripción ocupa más eje vertical.
 * Las reglas bonus mantienen el aspecto punteado pero pasan a "indented"
 * visualmente (margin-left) para enseñar que se apilan sobre la anterior.
 */
export function ScoringBox({
  title = "Cómo se puntúa",
  sections,
  dense = false,
  footnote,
  defaultOpen = false,
  className,
}: Props) {
  const totalRules = sections.reduce((sum, s) => sum + s.rules.length, 0);

  return (
    <details
      className={cn(
        "group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]",
        className,
      )}
      open={defaultOpen}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]",
          "marker:hidden [&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-150 group-open:rotate-90"
        />
        <span
          className={cn(
            "flex-1 font-mono uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]",
            dense ? "text-[0.55rem]" : "text-[0.6rem]",
          )}
        >
          {title}
        </span>
        <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {totalRules} {totalRules === 1 ? "regla" : "reglas"}
        </span>
      </summary>

      <div className="border-t border-[var(--color-border)]">
        <div
          className={cn(
            "max-h-72 overflow-y-auto",
            dense ? "px-3 py-3" : "px-3 py-4 sm:px-4",
          )}
        >
          <div className="space-y-4">
            {sections.map((section, sIdx) => (
              <div
                key={section.heading ?? `s${sIdx}`}
                className={cn(
                  sIdx > 0 &&
                    "border-t border-dashed border-[var(--color-border)] pt-3",
                )}
              >
                {section.heading ? (
                  <p className="mb-2 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[var(--color-arena)]">
                    {section.heading}
                  </p>
                ) : null}
                <ul className="space-y-1.5">
                  {section.rules.map((rule, rIdx) => (
                    <ScoringRow
                      key={`${sIdx}-${rIdx}`}
                      rule={rule}
                      dense={dense}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {footnote ? (
          <p className="border-t border-dashed border-[var(--color-border)] px-3 py-2 font-editorial text-[0.7rem] italic text-[var(--color-muted-foreground)]">
            {footnote}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function ScoringRow({ rule, dense }: { rule: ScoringRule; dense: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-md px-1 py-1.5",
        rule.bonus ? "ml-4 sm:ml-5" : "",
      )}
    >
      {/* Pill grande a la izquierda — el número manda */}
      <div
        className={cn(
          "flex shrink-0 flex-col items-center justify-center rounded-md border text-center",
          dense ? "min-w-[3rem] px-2 py-1.5" : "min-w-[3.5rem] px-2.5 py-2",
          rule.bonus
            ? "border-dashed border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]"
            : "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] shadow-[var(--shadow-arena)]",
        )}
      >
        <span
          className={cn(
            "font-display tabular leading-none text-[var(--color-arena)]",
            dense ? "text-xl" : "text-2xl",
            !rule.bonus && "glow-arena",
          )}
        >
          {(rule.prefix ?? (rule.bonus ? "+" : "")) + rule.points}
        </span>
        <span className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[var(--color-arena)]/70">
          {rule.bonus ? "bonus" : rule.points === 1 ? "pt" : "pts"}
        </span>
      </div>

      <span
        className={cn(
          "flex-1 leading-snug text-[var(--color-foreground)]",
          dense ? "text-xs" : "text-sm",
        )}
      >
        {rule.label}
      </span>
    </li>
  );
}

export { PointsPill };

/**
 * Tabla de puntuación siempre visible (no dropdown): columnas PTS · Regla ·
 * Ejemplo. Pensada para `/puntuacion` y la página de jornada. Cada
 * `ScoringSection` con `heading` se renderiza como un sub-bloque (p. ej.
 * "Fase de grupos" / "Fase final"). La columna Ejemplo solo aparece si alguna
 * regla trae `example`.
 */
export function ScoringTable({
  sections,
  className,
}: {
  sections: ScoringSection[];
  className?: string;
}) {
  const hasExample = sections.some((s) => s.rules.some((r) => r.example));
  const cols = hasExample ? 3 : 2;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      )}
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <th className="w-14 px-3 py-2 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Pts
            </th>
            <th className="px-3 py-2 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Regla
            </th>
            {hasExample ? (
              <th className="px-3 py-2 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Ejemplo
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sIdx) => (
            <ScoringTableSection
              key={section.heading ?? `s${sIdx}`}
              section={section}
              cols={cols}
              hasExample={hasExample}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoringTableSection({
  section,
  cols,
  hasExample,
}: {
  section: ScoringSection;
  cols: number;
  hasExample: boolean;
}) {
  return (
    <>
      {section.heading ? (
        <tr>
          <td
            colSpan={cols}
            className="border-t border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface-2))] px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[var(--color-arena)]"
          >
            {section.heading}
          </td>
        </tr>
      ) : null}
      {section.rules.map((rule, rIdx) => (
        <tr key={rIdx} className="border-t border-[var(--color-border)] align-middle">
          <td className="px-3 py-2.5">
            <span
              className={cn(
                "inline-flex min-w-[2.25rem] items-center justify-center rounded-md border px-1.5 py-0.5 font-display tabular text-base leading-none",
                rule.bonus
                  ? "border-dashed border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)] text-[var(--color-arena)]"
                  : "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)]",
              )}
            >
              {(rule.prefix ?? (rule.bonus ? "+" : "")) + rule.points}
            </span>
          </td>
          <td className="px-3 py-2.5 text-sm leading-snug text-[var(--color-foreground)]">
            {rule.label}
          </td>
          {hasExample ? (
            <td className="px-3 py-2.5">
              {rule.example ? (
                <span className="font-mono text-xs italic text-[var(--color-muted-foreground)]">
                  {rule.example}
                </span>
              ) : (
                <span className="text-[var(--color-muted-foreground)]/40">—</span>
              )}
            </td>
          ) : null}
        </tr>
      ))}
    </>
  );
}
