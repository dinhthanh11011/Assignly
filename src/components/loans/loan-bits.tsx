import { AlarmClock, CalendarCheck, CalendarClock, CircleAlert, CircleCheck, CircleSlash, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DUE_SOON_DAYS } from "@/lib/queries";
import { dueSentence } from "@/lib/copy";
import { cn, daysUntil, formatDate, formatMoney, initials } from "@/lib/utils";

type Side = "LEND" | "BORROW";

/**
 * Ô chữ viết tắt của người ngoài sổ (tên gõ tay, không có ảnh). Tròn vì là
 * NGƯỜI; tô theo chiều — xanh: họ nợ bạn, đỏ: bạn nợ họ. Chiều còn được nói
 * bằng chữ ở ngay cạnh, màu chỉ là tín hiệu phụ.
 */
export function CounterpartyAvatar({
  name,
  type,
  size = "md",
  className,
}: {
  name: string;
  type: Side;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        type === "LEND" ? "bg-income-surface text-income" : "bg-expense-surface text-expense",
        size === "lg" ? "size-14 text-title" : "size-11 text-label",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Thanh tiến độ đã trả / tổng. Luôn kèm một câu ("đã trả 40%") — thanh một
 * mình không đọc được bằng máy đọc màn hình hay khi mù màu.
 */
export function LoanProgressBar({
  type,
  paid,
  amount,
  showFigures = false,
  className,
}: {
  type: Side;
  paid: number;
  amount: number;
  /** Thêm "400.000 / 1.000.000 ₫" ở bên phải câu. */
  showFigures?: boolean;
  className?: string;
}) {
  const pct = amount > 0 ? Math.min(100, Math.round((paid / amount) * 100)) : 0;
  const verb = type === "LEND" ? "đã nhận lại" : "đã trả";
  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${verb} ${pct}%`}
        className="h-2 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-caption text-muted-foreground">
        <span>
          {verb} <span className="font-semibold text-foreground">{pct}%</span>
        </span>
        {showFigures && (
          <span className="num">
            {formatMoney(paid)} / {formatMoney(amount)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Trạng thái hạn trả / trạng thái khoản, dạng Badge có icon + chữ.
 * Trễ hẹn = đỏ, sắp tới hẹn = vàng, còn xa = trung tính. Khoản đã đóng thì nói
 * đã xong / đã bỏ.
 */
export function LoanStatusBadge({
  status,
  dueDate,
  overdue,
  stale,
  idleDays,
}: {
  status: "ACTIVE" | "PAID" | "CANCELLED";
  dueDate: Date | null;
  overdue: boolean;
  stale?: boolean;
  idleDays?: number;
}) {
  if (status === "PAID")
    return (
      <Badge variant="income">
        <CircleCheck aria-hidden /> Đã trả xong
      </Badge>
    );
  if (status === "CANCELLED")
    return (
      <Badge variant="muted">
        <CircleSlash aria-hidden /> Đã bỏ
      </Badge>
    );
  if (dueDate) {
    const days = daysUntil(new Date(dueDate));
    if (overdue || days < 0)
      return (
        <Badge variant="expense">
          <CircleAlert aria-hidden /> {dueSentence(days)}
        </Badge>
      );
    if (days <= DUE_SOON_DAYS)
      return (
        <Badge variant="warning">
          <AlarmClock aria-hidden /> {dueSentence(days)}
        </Badge>
      );
    return (
      <Badge variant="muted">
        <CalendarClock aria-hidden /> Hẹn {formatDate(new Date(dueDate))}
      </Badge>
    );
  }
  if (stale)
    return (
      <Badge variant="warning">
        <Hourglass aria-hidden /> {idleDays} ngày chưa động tới
      </Badge>
    );
  return null;
}

/** Ngày xong của một khoản đã đóng (kho lưu). */
export function ClosedOn({ date }: { date: Date }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
      <CalendarCheck className="size-4 shrink-0" aria-hidden /> Xong {formatDate(new Date(date))}
    </span>
  );
}
