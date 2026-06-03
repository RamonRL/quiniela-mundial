import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading por defecto de las páginas públicas. Da feedback inmediato mientras
 * el Server Component resuelve, en lugar de dejar la pantalla en blanco.
 */
export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
