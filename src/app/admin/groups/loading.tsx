import { Skeleton } from "@/components/ui/skeleton";

export default function AdminGroupsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-12" />
      <Skeleton className="h-96" />
    </div>
  );
}
