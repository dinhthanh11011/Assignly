import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, RowsSkeleton, StatsSkeleton } from "@/components/skeletons";

export default function BalanceLoading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={2} />
      <StatsSkeleton count={2} />
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-3.5 w-40 rounded-full" />
          <RowsSkeleton rows={4} height="h-14" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <RowsSkeleton rows={3} height="h-12" />
        </CardContent>
      </Card>
    </div>
  );
}
