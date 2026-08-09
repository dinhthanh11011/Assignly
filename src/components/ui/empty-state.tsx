import { cn } from "@/lib/utils";

/**
 * Ô "chưa có gì ở đây" — một bản, thay cho năm.
 *
 * Trước đợt này có năm bản chép tay với năm bộ bo góc/đệm khác nhau cho cùng
 * một khái niệm, trong đó hai bản trùng nhau tới từng ký tự trong chuỗi class.
 *
 * Hai thứ được sửa lại chứ không chỉ gom:
 *  · `rounded-xl`, KHÔNG phải bậc 2xl. Hợp đồng bo góc ở globals.css dành
 *    bậc 20px riêng cho tấm NỔI (hộp thoại, menu, thanh nav) — một ô trống nằm
 *    trong luồng thì không nổi lên cái gì cả.
 *  · Emoji ở `text-page` thay cho bậc 4xl của Tailwind. Bậc đó không nằm trong thang 9
 *    bậc của app, và quan trọng hơn: nó KHÔNG lớn lên theo cần gạt cỡ chữ, nên
 *    người đang để "Chữ lớn" thấy mọi thứ to lên trừ đúng chỗ này.
 */
export function EmptyState({
  emoji,
  children,
  action,
  size = "page",
  className,
}: {
  /** Vẽ với aria-hidden — nó trang trí, không mang tin. */
  emoji?: string;
  children: React.ReactNode;
  /** Nút gợi ý việc tiếp theo. */
  action?: React.ReactNode;
  /** `page` thay cho cả một danh sách; `inline` nằm trong một thẻ đã có viền. */
  size?: "page" | "inline";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-border text-center",
        size === "page" ? "rounded-xl px-6 py-14" : "rounded-lg px-4 py-9",
        className
      )}
    >
      {emoji && size === "page" && (
        <p className="text-page leading-none" aria-hidden>
          {emoji}
        </p>
      )}
      <div className={cn("text-body text-muted-foreground", emoji && size === "page" && "mt-3")}>
        {children}
      </div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
