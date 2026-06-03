"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Sección plegable estilo "feature row": una barra clicable (icono + título +
 * badge + descripción + flecha) que despliega/oculta su contenido. Plegada por
 * defecto. Reutilizable para los features premium de /mi-quiniela.
 */
export function CollapsibleSection({
  title,
  description,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[color-mix(in_oklch,var(--color-arena)_7%,transparent)] sm:px-5"
      >
        {icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-display text-sm tracking-tight">{title}</span>
            {badge ? (
              <span className="rounded-full bg-[var(--color-arena)] px-1.5 py-px text-[0.55rem] font-semibold tracking-[0.12em] text-white">
                {badge}
              </span>
            ) : null}
          </span>
          {description ? (
            <span className="mt-0.5 block truncate font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--color-arena)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="border-t border-[var(--color-arena)]/20 px-4 pb-5 pt-4 sm:px-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
