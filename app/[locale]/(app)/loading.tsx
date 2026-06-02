import { Skeleton } from "@/components/ui/skeleton";

/**
 * Default loading skeleton for any (app) route. Mirrors the rough rhythm of
 * the Stadium Editorial page header + content cards.
 */
export default function Loading() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-[var(--color-border)] pb-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
