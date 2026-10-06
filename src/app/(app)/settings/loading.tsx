import { Skeleton } from "@/components/ui/skeleton";

/** Khung xương của Cài đặt: tiêu đề + năm khay với số hàng như trang thật. */
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      {[3, 2, 2, 2].map((rows, i) => (
        <section key={i} className="space-y-2">
          <Skeleton className="ml-1 h-4 w-32" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex min-h-16 items-center gap-3.5 px-4 py-3">
                <Skeleton className="size-10 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3.5 w-56 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
