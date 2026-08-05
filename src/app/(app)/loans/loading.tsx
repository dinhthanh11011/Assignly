import { CardsSkeleton, ChipsSkeleton, HeaderSkeleton, StatsSkeleton } from "@/components/skeletons";

export default function LoansLoading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton actions={2} />
      <StatsSkeleton count={3} />
      <div className="space-y-2">
        <ChipsSkeleton count={2} />
        <ChipsSkeleton count={3} />
        <ChipsSkeleton count={4} />
      </div>
      <CardsSkeleton count={4} />
    </div>
  );
}
