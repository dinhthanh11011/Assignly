import { HeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-11 w-28" />
      <HeaderSkeleton actions={0} />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-13 min-w-0 flex-[1_1_16rem] rounded-xl" />
        <Skeleton className="h-11 w-48 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
