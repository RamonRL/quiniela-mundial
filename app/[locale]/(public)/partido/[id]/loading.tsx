import { Skeleton } from "@/components/ui/skeleton";

export default function PartidoLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
