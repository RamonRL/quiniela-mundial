import { Skeleton } from "@/components/ui/skeleton";

export default function RankingLoading() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-[var(--color-border)] pb-8">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </section>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
