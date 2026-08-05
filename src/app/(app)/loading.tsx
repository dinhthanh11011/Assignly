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
          <Skeleton className="h-9 w-40" />
          <Skeleton className="hidden h-10 w-36 md:block" />
        </div>
      </div>

      <Skeleton className="h-[188px] w-full rounded-xl" />

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] w-full rounded-lg" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-11 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
