import {
  ChartCardSkeleton,
  ChipsSkeleton,
  HeaderSkeleton,
  HeroSkeleton,
  StatsSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={1} />
      {/* Bộ chọn khoảng: hàng chip + câu "đang tính từ … đến …" */}
      <ChipsSkeleton count={5} />
      <Skeleton className="h-5 w-64 max-w-full" />
      {/* Chế độ mặc định là "Từng tháng" nên có thêm hàng ‹ tháng › dưới chip */}
      <Skeleton className="h-14 rounded-xl" />
      <HeroSkeleton />
      <StatsSkeleton count={2} />
      <ChartCardSkeleton height="h-40" />
      <ChartCardSkeleton height="h-64" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
