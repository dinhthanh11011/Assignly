import { Skeleton } from "@/components/ui/skeleton";

/** Khung một thẻ biểu đồ: tiêu đề + nút bảng + vùng vẽ. */
function PanelSkeleton({ height }: { height: string }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40 max-w-[60%]" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className={`w-full rounded-lg ${height}`} />
    </div>
  );
}

/** Khung phần số liệu của trang Báo cáo — cùng bố cục với ReportBody. */
export function ReportBodySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải báo cáo">
      {/* Thẻ số dư lớn (BalanceHero) */}
      <Skeleton className="h-72 w-full rounded-xl" />
      <PanelSkeleton height="h-64 md:h-72" />
      <PanelSkeleton height="h-60" />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <PanelSkeleton height="h-40" />
        <PanelSkeleton height="h-40" />
      </div>
    </div>
  );
}

/** Bộ chọn khoảng: khay ba kiểu + hàng ‹ tháng › + câu khoảng ngày. */
export function RangePickerSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[3.25rem] w-full rounded-xl" />
      <Skeleton className="h-[3.25rem] w-full rounded-xl" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}
