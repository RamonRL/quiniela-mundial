import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton genérico para rutas /admin/*. Suspense fallback mientras la
 * página fetcha datos. La barra de progreso top-of-page del root layout da
 * el feedback inmediato al click.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-3 border-b border-[var(--color-border)] pb-8">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-3/4 max-w-2xl" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
