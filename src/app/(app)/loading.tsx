import { Skeleton } from "@/components/ui/skeleton";

/** Khung xương của Tổng quan: lời chào · thẻ ví + gần đây | việc cần làm. */
export default function HomeLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <Skeleton className="h-72 rounded-2xl" />
          <div className="space-y-px overflow-hidden rounded-xl border border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-none" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
