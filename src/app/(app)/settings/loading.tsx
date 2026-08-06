import { Skeleton } from "@/components/ui/skeleton";

/** Cài đặt giờ là trang async (đọc danh sách sổ) nên cần khung xương riêng. */
export default function SettingsLoading() {
  return (
    <div className="space-y-7">
      <Skeleton className="h-12 w-48" />
      {[3, 1, 2, 2, 2].map((rows, i) => (
        <section key={i} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-px overflow-hidden rounded-xl border border-border">
            {Array.from({ length: rows }).map((_, r) => (
              <Skeleton key={r} className="h-16 rounded-none" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
