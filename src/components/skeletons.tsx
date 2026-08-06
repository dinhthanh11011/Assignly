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
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-40 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/** Panel số dư lớn ở đầu trang. */
export function HeroSkeleton() {
  return <Skeleton className="h-[280px] w-full rounded-xl" />;
}

/** Hàng thẻ số liệu (ai nợ ai, khoản trễ hẹn…). */
export function StatsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3", count >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
      ))}
    </div>
  );
}

/** Dải chip lọc. */
export function ChipsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-28 rounded-full" />
      ))}
    </div>
  );
}

/** Danh sách các dòng dữ liệu (khoản, người trong sổ…). */
export function RowsSkeleton({ rows = 6, height = "h-[76px]" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-xl", height)} />
      ))}
    </div>
  );
}

/** Lưới thẻ (khoản mượn, sổ). */
export function CardsSkeleton({ count = 4, height = "h-[148px]" }: { count?: number; height?: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
        <Skeleton className="h-5 w-40 rounded-full" />
        <Skeleton className={cn("w-full rounded-xl", height)} />
      </CardContent>
    </Card>
  );
}
