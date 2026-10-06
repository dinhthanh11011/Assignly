import { Skeleton } from "@/components/ui/skeleton";

/** Khung xương trang Sổ — cùng bố cục với trang thật để không nhảy khi tải xong. */
export default function LedgerLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải sổ">
      {/* Tiêu đề trang */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-56" />
      </div>
      {/* Thanh tháng: hàng điều hướng + ba con số */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 p-1">
          <Skeleton className="size-11 rounded-lg" />
          <Skeleton className="mx-auto h-7 w-40" />
          <Skeleton className="size-11 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 px-2 py-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
      {/* Lịch (gấp/mở) */}
      <Skeleton className="h-11 w-40" />
      <Skeleton className="h-72 rounded-xl" />
      {/* Ô tìm + nút lọc, rồi Tất cả/Chi/Thu */}
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-12 w-14 rounded-lg" />
      </div>
      <Skeleton className="h-[3.25rem] rounded-xl" />
      {/* Hai nhóm ngày */}
      {[3, 2].map((rows, i) => (
        <section key={i} className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex min-h-20 items-start gap-3.5 px-4 py-3">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
