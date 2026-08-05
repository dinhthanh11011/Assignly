import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Các mảnh khung xương dùng chung cho `loading.tsx` của từng route và cho
 * fallback của `<Suspense>` trong trang.
 *
 * Nguyên tắc: khung xương phải **đúng chiều cao** với nội dung thật, nếu không
 * lúc dữ liệu về trang sẽ nhảy — cảm giác còn tệ hơn là chờ.
 */

/** Tiêu đề trang + các nút/bộ chọn bên phải. */
export function HeaderSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-48 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-36 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/** Panel số dư lớn ở đầu trang. */
export function HeroSkeleton() {
  return <Skeleton className="h-[236px] w-full rounded-2xl" />;
}

/** Hàng thẻ số liệu (còn phải thu / phải trả / quá hạn…). */
export function StatsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className={cn("grid gap-3", count >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[78px] w-full rounded-xl" />
      ))}
    </div>
  );
}

/** Dải chip lọc. */
export function ChipsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-full" />
      ))}
    </div>
  );
}

/** Danh sách các dòng dữ liệu (giao dịch, thành viên…). */
export function RowsSkeleton({ rows = 6, height = "h-16" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-xl", height)} />
      ))}
    </div>
  );
}

/** Lưới thẻ (khoản vay, sổ chung). */
export function CardsSkeleton({ count = 4, height = "h-[132px]" }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-xl", height)} />
      ))}
    </div>
  );
}

/** Thẻ có tiêu đề + một biểu đồ bên trong. */
export function ChartCardSkeleton({ height = "h-56" }: { height?: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <Skeleton className="h-3.5 w-36 rounded-full" />
        <Skeleton className={cn("w-full rounded-xl", height)} />
      </CardContent>
    </Card>
  );
}
