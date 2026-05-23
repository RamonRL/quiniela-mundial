import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export function InteractiveModeBanner({
  href,
  hint = "Una decisión por pantalla. Auto-guardado.",
}: {
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] px-4 py-3 transition hover:border-[var(--color-arena)] hover:bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))]"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-md border border-[var(--color-arena)]/40 bg-[var(--color-surface)] text-[var(--color-arena)]">
          <Zap className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-arena)]">
            ¿Te abruma?
          </p>
          <p className="font-editorial text-sm italic text-[var(--color-foreground)]">
            Prueba el modo paso a paso ·{" "}
            <span className="text-[var(--color-muted-foreground)]">{hint}</span>
          </p>
        </div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-[var(--color-arena)] transition group-hover:translate-x-0.5" />
    </Link>
  );
}
