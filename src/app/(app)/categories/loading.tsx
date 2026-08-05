import { ChipsSkeleton, HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function CategoriesLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton actions={1} />
      <ChipsSkeleton count={2} />
      <RowsSkeleton rows={8} height="h-14" />
    </div>
  );
}
