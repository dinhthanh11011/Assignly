import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/utils";

/**
 * Hai ô tổng ở đầu trang Nợ: "Người ta nợ bạn" / "Bạn nợ người ta". Bấm ô nào
 * thì cuộn xuống nhóm đó. Hai cột khi khối đủ rộng (đo theo em của chính khối,
 * nên ở "Chữ lớn" tự về một cột thay vì cắt số).
 */
export function DebtSummary({
  receivable,
  payable,
  lendCount,
  borrowCount,
}: {
  receivable: number;
  payable: number;
  lendCount: number;
  borrowCount: number;
}) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @min-[30em]:grid-cols-2">
        <Tile
          href="#ho-no-ban"
          label="Người ta nợ bạn"
          value={receivable}
          tone="income"
          count={lendCount}
          enabled={lendCount > 0}
        />
        <Tile
          href="#ban-no-ho"
          label="Bạn nợ người ta"
          value={-payable}
          tone="expense"
          count={borrowCount}
          enabled={borrowCount > 0}
        />
      </div>
    </div>
  );
}

function Tile({
  href,
  label,
  value,
  tone,
  count,
  enabled,
}: {
  href: string;
  label: string;
  value: number;
  tone: "income" | "expense";
  count: number;
  enabled: boolean;
}) {
  const body = (
    <>
      <span className="text-label text-muted-foreground">{label}</span>
      <Amount value={value} tone={value === 0 ? "neutral" : tone} size="lg" icon />
      <span className="text-caption text-muted-foreground">
        {count > 0 ? `${count} khoản đang mở` : "Không có khoản nào"}
      </span>
    </>
  );
  const shape = "flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4";
  if (!enabled) return <div className={shape}>{body}</div>;
  return (
    <Link href={href} className={cn(shape, "focus-ring transition-colors duration-150 hover:bg-sunken")}>
      {body}
    </Link>
  );
}
