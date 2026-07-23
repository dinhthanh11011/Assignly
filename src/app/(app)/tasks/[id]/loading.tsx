import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TaskDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  );
}
