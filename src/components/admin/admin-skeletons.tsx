import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AdminStatGrid } from "@/components/admin/admin-shell";
import { DataTableSkeleton } from "@/components/admin/data-table";

/** Khung giữ chỗ cho các trang admin — cùng bố cục với trang thật để không nhảy. */

export function HeaderSkeleton({ crumbs = false, avatar = false }: { crumbs?: boolean; avatar?: boolean }) {
  return (
    <div className="space-y-3" aria-hidden>
      {crumbs && <Skeleton className="h-4 w-48" />}
      <div className="flex items-center gap-4">
        {avatar && <Skeleton className="size-14 shrink-0 rounded-full" />}
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4, wide = 4 }: { count?: number; wide?: 3 | 4 }) {
  return (
    <AdminStatGrid wide={wide}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4" aria-hidden>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ))}
    </AdminStatGrid>
  );
}

export function PanelSkeleton({ className, rows = 4, table = false }: { className?: string; rows?: number; table?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)} aria-hidden>
      <div className="border-b border-border px-4 py-3.5 md:px-5">
        <Skeleton className="h-5 w-40" />
      </div>
      {table ? (
        <DataTableSkeleton rows={rows} columns={4} />
      ) : (
        <div className="space-y-3 p-4 md:p-5">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Trang danh sách: tiêu đề · ô tìm + chip · bảng · chân phân trang. */
export function ListPageSkeleton({ chips = 4 }: { chips?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải danh sách">
      <HeaderSkeleton crumbs />
      <div className="rounded-xl border border-border bg-card">
        <div className="space-y-3 border-b border-border p-3 md:p-4" aria-hidden>
          <Skeleton className="h-12 md:max-w-md" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: chips }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-28" />
            ))}
          </div>
        </div>
        <DataTableSkeleton rows={10} columns={6} />
        <div className="flex justify-between border-t border-border px-4 py-2.5" aria-hidden>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-11 w-44" />
        </div>
      </div>
    </div>
  );
}

/** Trang chi tiết hai cột: thông tin | hoạt động. */
export function DetailPageSkeleton({ avatar = true }: { avatar?: boolean }) {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải">
      <HeaderSkeleton crumbs avatar={avatar} />
      <StatsSkeleton />
      <div className="grid grid-cols-1 gap-6 @min-[60rem]/admin:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          <PanelSkeleton rows={6} />
          <PanelSkeleton rows={2} />
        </div>
        <div className="min-w-0 space-y-6">
          <PanelSkeleton table rows={4} />
          <PanelSkeleton table rows={5} />
        </div>
      </div>
    </div>
  );
}
