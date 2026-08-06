import { CardsSkeleton, ChipsSkeleton, HeaderSkeleton, StatsSkeleton } from "@/components/skeletons";

/** Khung xương trang Nợ: tiêu đề + hai tab + hai thẻ tóm tắt + danh sách. */
export default function DebtLoading() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton actions={1} />
      <ChipsSkeleton count={2} />
      <StatsSkeleton count={2} />
      <CardsSkeleton count={4} />
    </div>
  );
}
