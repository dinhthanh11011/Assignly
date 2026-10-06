import { cn } from "@/lib/utils";

/**
 * Ô "chưa có gì ở đây": icon lucide trong ô tròn nhạt · một câu giải thích ·
 * một hành động gợi ý việc tiếp theo (skill: empty-states).
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  size = "page",
  className,
}: {
  /** Icon lucide, trang trí (aria-hidden). */
  icon?: React.ElementType;
  /** Dòng đậm phía trên lời giải thích. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Nút gợi ý việc tiếp theo. */
  action?: React.ReactNode;
  /** `page` thay cho cả một danh sách; `inline` nằm trong một thẻ đã có viền. */
  size?: "page" | "inline";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "page"
          ? "rounded-xl border border-dashed border-border bg-card px-6 py-12"
          : "px-4 py-8",
        className
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mb-4 flex items-center justify-center rounded-full bg-primary-surface text-primary",
            size === "page" ? "size-14" : "size-11"
          )}
          aria-hidden
        >
          <Icon className={size === "page" ? "size-7" : "size-5"} />
        </span>
      )}
      {title && <p className="text-body-lg text-foreground">{title}</p>}
      {children && (
        <div className={cn("max-w-sm text-body text-muted-foreground", title && "mt-1")}>{children}</div>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
