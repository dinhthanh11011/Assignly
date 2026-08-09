import { cn } from "@/lib/utils";

/**
 * Hình dáng chuẩn của một HÀNG BẤM ĐƯỢC.
 *
 * Sáu chỗ trong app từng chép tay gần đúng cùng chuỗi class này, và chúng đã
 * trôi khỏi nhau: khoảng cách giữa icon và chữ chạy từ `gap-3` tới `gap-4`,
 * chiều cao tối thiểu từ `min-h-16` tới `min-h-20` tới `min-h-[76px]`, và vòng
 * tiêu điểm thì mỗi nơi một kiểu. Không có khác biệt nào trong số đó là cố ý —
 * chúng chỉ là kết quả của việc chép rồi sửa.
 *
 * Xuất ra CẢ chuỗi class lẫn component, và đó là chủ ý: ruột của hàng giao dịch
 * (số tiền, loại, người trả, ngày) đặc thù tới mức ép nó qua props sẽ làm API
 * của Row phình ra vô nghĩa. Chỗ đó chỉ mượn `rowClass()`.
 *
 * Vòng tiêu điểm mặc định là bản INSET: hàng gần như luôn nằm trong một ngăn
 * `divide-y overflow-hidden`, mà ngăn đó cắt mất phần vòng vẽ ra ngoài mép.
 */
export function rowClass(opts?: { size?: "default" | "tall"; container?: "flush" | "card" }) {
  const { size = "default", container = "flush" } = opts ?? {};
  return cn(
    "flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors",
    "hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50",
    size === "tall" ? "min-h-20" : "min-h-16",
    container === "card"
      ? "focus-ring rounded-xl border border-border bg-card"
      : "focus-ring-inset"
  );
}

/** Ô vuông chứa icon ở đầu hàng. */
export function RowIcon({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: React.ElementType;
  tone?: "primary" | "income" | "expense" | "warning" | "neutral";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary-surface text-primary",
    income: "bg-income-surface text-income",
    expense: "bg-expense-surface text-expense",
    warning: "bg-warning-surface text-warning",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg",
        tones[tone],
        className
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}
