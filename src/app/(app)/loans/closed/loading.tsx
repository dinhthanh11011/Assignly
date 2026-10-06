import { ChipsSkeleton, HeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { LoanCardsSkeleton } from "@/components/loans/loan-skeletons";

/** Khung kho lưu: quay lại · tiêu đề · ô tìm · chip trạng thái · lưới thẻ. */
export default function ClosedLoansLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-6 w-32" />
      <HeaderSkeleton actions={0} />
      <Skeleton className="h-12 w-full rounded-lg" />
      <ChipsSkeleton count={3} />
      <LoanCardsSkeleton count={6} />
    </div>
  );
}
