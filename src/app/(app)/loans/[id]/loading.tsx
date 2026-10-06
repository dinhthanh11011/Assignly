import { Skeleton } from "@/components/ui/skeleton";

/** Khung trang chi tiết khoản mượn — cùng bố cục với page.tsx. */
export default function LoanDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48 max-w-full" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-56 max-w-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-[3.25rem] w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3.5">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
