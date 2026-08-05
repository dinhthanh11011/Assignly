import { cn } from "@/lib/utils";

/** Khối giữ chỗ nhấp nháy, dùng cho trạng thái loading của từng route. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-sunken", className)} {...props} />;
}
