import { Skeleton } from "@/components/ui/skeleton";

/** Khung xương của trang Ghi chép: dải tháng + hàng lọc + hai nhóm ngày. */
export default function LedgerLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-56" />
      <Skeleton className="h-44 rounded-xl" />
      {/* Nút đổi cách xem (danh sách / lịch) rồi mới tới hàng lọc */}
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      {[3, 2].map((rows, i) => (
        <section key={i} className="space-y-2">
          <Skeleton className="h-9 w-40 rounded-md" />
          <div className="space-y-px overflow-hidden rounded-xl border border-border">
            {Array.from({ length: rows }).map((_, r) => (
              <Skeleton key={r} className="h-[76px] rounded-none" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
