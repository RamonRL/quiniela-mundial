"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Paginador genérico de cliente. Recibe los elementos YA renderizados en
 * servidor (cada uno con su `key`), los corta por página y renderiza solo la
 * página actual dentro de un `<ul>`, más los controles. Mantener el render de
 * cada fila en servidor evita mandar lógica/traducciones al cliente: aquí solo
 * vive el estado de "qué página veo".
 *
 * `info` es una plantilla cruda con los marcadores {from} {to} {total} (se
 * sustituyen en cliente porque cambian al pasar de página).
 */
export function Paginator({
  items,
  pageSize = 20,
  labels,
}: {
  items: React.ReactNode[];
  pageSize?: number;
  labels: { prev: string; next: string; info: string };
}) {
  const [page, setPage] = useState(0);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages - 1);
  const from = current * pageSize;
  const to = Math.min(from + pageSize, total);
  const slice = items.slice(from, to);

  const info = labels.info
    .replace("{from}", String(total === 0 ? 0 : from + 1))
    .replace("{to}", String(to))
    .replace("{total}", String(total));

  return (
    <>
      <ul>{slice}</ul>
      {pages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] tabular">
            {info}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/50 hover:text-[var(--color-arena)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-foreground)]"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">{labels.prev}</span>
            </button>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/50 hover:text-[var(--color-arena)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-foreground)]"
            >
              <span className="hidden sm:inline">{labels.next}</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
