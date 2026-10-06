import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RowsSkeleton } from "@/components/skeletons";

export default function GroupDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-11 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-5 w-40 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[22rem]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[3, 4].map((rows, i) => (
          <Card key={i} className="space-y-4 p-5">
            <Skeleton className="h-5 w-40" />
            <RowsSkeleton rows={rows} height="h-14" />
          </Card>
        ))}
      </div>
    </div>
  );
}
