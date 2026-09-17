import { Skeleton } from "@/components/ui/skeleton";

export default function AdminGroupDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-11 w-40" />
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-3 @min-[34rem]/admin:grid-cols-2 @min-[60rem]/admin:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}
