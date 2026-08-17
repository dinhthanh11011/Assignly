import { CardsSkeleton, ChipsSkeleton, HeaderSkeleton } from "@/components/skeletons";

/** Khung xương kho lưu: tiêu đề + hàng chip trạng thái + danh sách thẻ. */
export default function ClosedLoansLoading() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton actions={0} />
      <ChipsSkeleton count={3} />
      <CardsSkeleton count={6} />
    </div>
  );
}
