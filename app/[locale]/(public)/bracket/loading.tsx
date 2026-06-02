import { Skeleton } from "@/components/ui/skeleton";

export default function BracketLoading() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-[var(--color-border)] pb-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>
      <Skeleton className="h-[900px] w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
