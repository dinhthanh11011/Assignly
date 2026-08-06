import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RowsSkeleton } from "@/components/skeletons";

export default function GroupDetailLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-5 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <RowsSkeleton rows={3} height="h-14" />
        </CardContent>
      </Card>
    </div>
  );
}
