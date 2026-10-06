import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PanelSkeleton, StatsSkeleton } from "@/components/admin/admin-skeletons";

export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải tổng quan">
      <HeaderSkeleton />
      <StatsSkeleton count={6} wide={3} />
      <div className="grid grid-cols-1 gap-6 @min-[64rem]/admin:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 md:p-5" aria-hidden>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-10 w-56" />
            <Skeleton className="mt-4 h-64" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 md:p-5" aria-hidden>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-56" />
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}
