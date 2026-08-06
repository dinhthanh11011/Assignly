import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RowsSkeleton } from "@/components/skeletons";

export default function LoanDetailLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-[188px] w-full rounded-xl" />
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-3.5 w-36 rounded-md" />
          <RowsSkeleton rows={4} height="h-14" />
        </CardContent>
      </Card>
    </div>
  );
}
