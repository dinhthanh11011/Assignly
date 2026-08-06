import {
  ChartCardSkeleton,
  ChipsSkeleton,
  HeaderSkeleton,
  HeroSkeleton,
  StatsSkeleton,
} from "@/components/skeletons";

export default function ReportsLoading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={1} />
      <ChipsSkeleton count={3} />
      <HeroSkeleton />
      <StatsSkeleton count={2} />
      <ChartCardSkeleton height="h-64" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
