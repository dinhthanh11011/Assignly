import { HeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { LoanCardsSkeleton } from "@/components/loans/loan-skeletons";

/** Khung trang Nợ: tiêu đề · tab · hai ô tổng · ô tìm · danh sách thẻ. */
export default function DebtLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <HeaderSkeleton actions={1} />
      <div className="space-y-2">
        <Skeleton className="h-[3.25rem] w-full rounded-xl" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-7 w-48" />
      <LoanCardsSkeleton count={4} />
    </div>
  );
}
