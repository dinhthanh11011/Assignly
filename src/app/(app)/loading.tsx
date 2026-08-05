import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton dùng chung cho mọi route trong khu vực đã đăng nhập: tiêu đề + thẻ
 * số dư + hai khối nội dung — khớp với bố cục thật để không bị "nhảy" layout.
 */
export default function AppLoading() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52 max-w-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="hidden h-10 w-36 rounded-full md:block" />
        </div>
      </div>

      <Skeleton className="h-[236px] w-full rounded-2xl" />

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px] w-full rounded-xl" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-3.5 w-32 rounded-full" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
