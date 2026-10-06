import { Skeleton } from "@/components/ui/skeleton";

/** Khung một LoanCard: avatar + tên · số còn lại · thanh tiến độ · nút. */
export function LoanCardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-44 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-end gap-1.5">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="size-11" />
      </div>
    </div>
  );
}

export function LoanCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <LoanCardSkeleton key={i} />
      ))}
    </div>
  );
}
