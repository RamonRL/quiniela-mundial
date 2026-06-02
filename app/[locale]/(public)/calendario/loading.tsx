import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarioLoading() {
  return (
    <div className="space-y-10">
      <header className="space-y-3 border-b border-[var(--color-border)] pb-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <section key={sectionIdx} className="space-y-4">
          <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-12" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-48" />
              </div>
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
