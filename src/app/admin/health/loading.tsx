import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PanelSkeleton, StatsSkeleton } from "@/components/admin/admin-skeletons";

export default function AdminHealthLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang kiểm tra hệ thống">
      <HeaderSkeleton crumbs />
      <Skeleton className="h-24 rounded-xl" />
      <StatsSkeleton />
      <div className="grid grid-cols-1 gap-6 @min-[60rem]/admin:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PanelSkeleton table rows={6} />
        <div className="min-w-0 space-y-6">
          <PanelSkeleton rows={6} />
          <PanelSkeleton rows={6} />
        </div>
      </div>
    </div>
  );
}
