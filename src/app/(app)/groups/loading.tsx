import { HeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsLoading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={2} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
