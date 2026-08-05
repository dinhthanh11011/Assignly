import {
  ChipsSkeleton,
  HeaderSkeleton,
  HeroSkeleton,
  RowsSkeleton,
} from "@/components/skeletons";

export default function TransactionsLoading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={3} />
      <HeroSkeleton />
      <div className="space-y-2">
        <ChipsSkeleton count={3} />
        <ChipsSkeleton count={4} />
      </div>
      <RowsSkeleton rows={7} />
    </div>
  );
}
