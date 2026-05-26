import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Paginación clásica server-side para listados admin. Genera enlaces
 * con `?page=N` y conserva el resto de la query string actual. No usa
 * estado de cliente — todo se navega vía `Link`.
 *
 * Layout:
 *   « primero · ‹ anterior · 1 … 4 [5] 6 … 12 · siguiente › · última »
 *
 * Cuando hay ≤ 7 páginas se muestran todas; si hay más, se aplica una
 * ventana de ±2 alrededor de la actual con elipsis en los extremos.
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  baseHref,
  searchParams,
  className,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  baseHref: string;
  /** Resto de query params actuales para preservar (search, filtros, etc.). */
  searchParams?: Record<string, string | string[] | undefined>;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (page: number): string => {
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [k, v] of Object.entries(searchParams)) {
        if (k === "page" || v == null) continue;
        if (Array.isArray(v)) {
          for (const item of v) params.append(k, item);
        } else {
          params.set(k, v);
        }
      }
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  const pages = pageWindow(currentPage, totalPages);
  const firstItem = (currentPage - 1) * perPage + 1;
  const lastItem = Math.min(currentPage * perPage, totalItems);

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3",
        className,
      )}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {firstItem}–{lastItem} de {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <PageButton
          href={hrefFor(1)}
          disabled={isFirst}
          aria-label="Primera página"
        >
          <ChevronsLeft className="size-3.5" />
        </PageButton>
        <PageButton
          href={hrefFor(Math.max(1, currentPage - 1))}
          disabled={isFirst}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-3.5" />
        </PageButton>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`gap-${idx}`}
              className="px-1 font-mono text-[0.6rem] text-[var(--color-muted-foreground)]"
            >
              …
            </span>
          ) : (
            <PageButton
              key={p}
              href={hrefFor(p)}
              active={p === currentPage}
              aria-label={`Página ${p}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              <span className="px-0.5 font-mono tabular text-xs">{p}</span>
            </PageButton>
          ),
        )}

        <PageButton
          href={hrefFor(Math.min(totalPages, currentPage + 1))}
          disabled={isLast}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-3.5" />
        </PageButton>
        <PageButton
          href={hrefFor(totalPages)}
          disabled={isLast}
          aria-label="Última página"
        >
          <ChevronsRight className="size-3.5" />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  href,
  disabled,
  active,
  children,
  ...aria
}: {
  href: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
} & React.AriaAttributes) {
  const classes = cn(
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 transition",
    active
      ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
      : disabled
        ? "border-[var(--color-border)] text-[var(--color-muted-foreground)]/50 opacity-50"
        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-arena)]/50 hover:bg-[var(--color-surface-2)]",
  );

  if (disabled) {
    return (
      <span aria-disabled className={classes} {...aria}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={classes} {...aria}>
      {children}
    </Link>
  );
}

/**
 * Ventana de páginas: la actual, sus dos vecinas a cada lado, y la 1 y
 * la última siempre presentes. Insertamos `"..."` cuando hay hueco.
 *
 * Ejemplos:
 *   total=5, current=3   → [1, 2, 3, 4, 5]
 *   total=12, current=5  → [1, "...", 3, 4, 5, 6, 7, "...", 12]
 *   total=12, current=1  → [1, 2, 3, 4, 5, "...", 12]
 *   total=12, current=12 → [1, "...", 8, 9, 10, 11, 12]
 */
function pageWindow(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const out: (number | "...")[] = [];
  const window = new Set<number>([1, total, current - 1, current, current + 1]);
  // Asegurar 2 vecinos a cada lado siempre que estemos cerca de los extremos.
  if (current <= 3) {
    window.add(2);
    window.add(3);
    window.add(4);
  }
  if (current >= total - 2) {
    window.add(total - 1);
    window.add(total - 2);
    window.add(total - 3);
  }

  const sorted = Array.from(window)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    const next = sorted[i + 1];
    if (next != null && next - sorted[i] > 1) out.push("...");
  }
  return out;
}
