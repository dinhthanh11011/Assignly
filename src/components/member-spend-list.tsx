import { MemberAvatar } from "@/components/member-avatar";
import type { MemberSpend } from "@/lib/queries";
import { memberLabel } from "@/lib/member";
import { Amount } from "@/components/ui/amount";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/report-charts";
import { formatMoney } from "@/lib/utils";

function activeRows(rows: MemberSpend[]) {
  return rows.filter((r) => r.paid > 0 || r.share > 0);
}

/**
 * Ai bỏ tiền ra bao nhiêu trong khoảng đang xem, so với phần mình phải chịu.
 *
 * Hai con số khác nhau và hay bị trộn: "bỏ ra" là tiền ra khỏi ví người đó,
 * "phần chịu" là phần thật của người đó sau khi chia. Chênh lệch (có dấu) là
 * tiền đang ứng cho nhóm (+) hay được người khác ứng hộ (−). Bó theo khoảng
 * đang xem — ai-nợ-ai toàn thời gian nằm ở tab "Tiền chung" của trang Nợ.
 */
export function MemberSpendList({ rows, totalExpense }: { rows: MemberSpend[]; totalExpense: number }) {
  const active = activeRows(rows);
  if (active.length === 0) return <EmptyState size="inline">Khoảng này chưa ai chi khoản nào.</EmptyState>;

  const peak = Math.max(1, ...active.flatMap((r) => [r.paid, r.share]));

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {active.map((r) => {
          const advanced = r.paid - r.share;
          return (
            <li key={r.user.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="flex min-w-0 items-center gap-2.5">
                  <MemberAvatar user={r.user} className="size-9 shrink-0" />
                  <span className="min-w-0 truncate text-body-lg">
                    {memberLabel({ ...r.user })}
                    {!r.isMember && <span className="text-muted-foreground"> (đã rời sổ)</span>}
                  </span>
                </span>
                <span className="ml-auto flex shrink-0 flex-col items-end">
                  <Amount value={advanced} size="body" />
                  <span className="text-caption text-muted-foreground">
                    {advanced > 0 ? "ứng cho nhóm" : advanced < 0 ? "được ứng hộ" : "vừa đúng phần"}
                  </span>
                </span>
              </div>
              <Meter label="Bỏ ra" value={r.paid} peak={peak} className="bg-chart-1" />
              <Meter label="Phần chịu" value={r.share} peak={peak} className="bg-chart-6" />
            </li>
          );
        })}
      </ul>

      <p className="border-t border-border pt-3 text-body text-muted-foreground">
        Cả sổ chi <span className="num font-semibold text-foreground">{formatMoney(totalExpense)}</span> trong
        khoảng này.
      </p>
    </div>
  );
}

function Meter({ label, value, peak, className }: { label: string; value: number; peak: number; className: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_auto] items-center gap-2.5 text-caption">
      <span className="text-muted-foreground">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <span
          className={`block h-full rounded-full ${className}`}
          style={{ width: `${Math.max(value > 0 ? 2 : 0, (value / peak) * 100)}%` }}
        />
      </span>
      <span className="num text-foreground">{formatMoney(value)}</span>
    </div>
  );
}

/** Bảng thay thế cho khối trên ("Xem dạng bảng"). */
export function memberSpendTable(rows: MemberSpend[], label: string) {
  const active = activeRows(rows);
  return (
    <DataTable
      caption={`Ai bỏ tiền ra, ${label}`}
      head={["Người", "Bỏ ra", "Phần chịu", "Chênh"]}
      rows={active.map((r) => {
        const d = r.paid - r.share;
        return [
          memberLabel({ ...r.user }) + (r.isMember ? "" : " (đã rời sổ)"),
          formatMoney(r.paid),
          formatMoney(r.share),
          d === 0 ? formatMoney(0) : `${d > 0 ? "+" : "−"}${formatMoney(Math.abs(d))}`,
        ];
      })}
    />
  );
}
