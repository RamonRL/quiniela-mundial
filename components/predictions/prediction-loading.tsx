import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton compartido para las páginas de predicción (grupos, jornada,
 * especiales, bracket). Reproduce la cabecera + una rejilla de tarjetas para
 * dar feedback inmediato mientras el Server Component resuelve sus queries.
 */
export function PredictionLoading() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-[var(--color-border)] pb-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
