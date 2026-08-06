import { cn } from "@/lib/utils";

/** Khối giữ chỗ nhấp nháy, dùng cho trạng thái loading của từng route. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // bg-muted chứ không bg-sunken: ở nền sáng mới, sunken gần như trùng
  // background nên skeleton sẽ vô hình.
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
