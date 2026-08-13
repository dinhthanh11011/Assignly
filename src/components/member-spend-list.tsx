import { MemberAvatar } from "@/components/member-avatar";
import type { MemberSpend } from "@/lib/queries";
import { memberLabel } from "@/lib/member";
import { EmptyHint } from "@/components/page-shell";
import { formatMoney } from "@/lib/utils";

/**
 * Ai bỏ tiền ra bao nhiêu trong khoảng đang xem — phần TIỀN CHUNG của trang Báo cáo.
 *
 * Vì sao thêm khối này: hai thẻ nợ ở trên nói về chuyện cho mượn (bảng `Loan`),
 * còn tiền cả nhà cùng chi thì trước đây trang Báo cáo không nói gì — nên hai
 * loại "nợ" rất khác nhau bị đọc lẫn vào nhau. Đây là câu trả lời cho "trong
 * khoảng này AI chi bao nhiêu", thứ mà bốn cái biểu đồ theo danh mục không nói.
 *
 * Cố ý KHÔNG trùng với tab "Tiền chung" ở `/loans`: bên đó là ai-nợ-ai tính TOÀN
 * THỜI GIAN (nợ nhau không hết khi sang tháng), còn đây bó đúng theo khoảng đang
 * xem và không đề xuất chuyển tiền.
 *
 * Mỗi hàng nói CẢ HAI con số, vì chúng khác nhau và hay bị trộn: "bỏ ra" là tiền
 * ra khỏi ví người đó, "phần phải chịu" là phần thật sự của người đó sau khi
 * chia. Ai bỏ ra nhiều hơn phần mình chịu thì đang ứng tiền cho cả nhóm.
 */
export function MemberSpendList({ rows, totalExpense }: { rows: MemberSpend[]; totalExpense: number }) {
  const active = rows.filter((r) => r.paid > 0 || r.share > 0);
  if (active.length === 0) return <EmptyHint>Khoảng này chưa ai chi khoản nào.</EmptyHint>;

  const peak = Math.max(1, ...active.map((r) => r.paid));

  return (
    <div className="space-y-3.5">
      {active.map((r) => {
        const advanced = r.paid - r.share;
        return (
          <div key={r.user.id} className="space-y-1.5">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <span className="flex min-w-0 items-center gap-2">
                <MemberAvatar user={r.user} className="size-8 shrink-0" />
                <span className="min-w-0 truncate text-body-lg">
                  {memberLabel({ ...r.user })}
                  {!r.isMember && " (đã rời sổ)"}
                </span>
              </span>
              {/* Con số cần một cái nhãn dính liền nó. Bản trước để số trơ ở đây
                  rồi nhắc lại "Bỏ ra 8.200.000 ₫" ở dòng dưới — cùng một con số
                  in hai lần, và cái to hơn lại là cái không có nhãn. */}
              <span className="shrink-0 text-right">
                <span className="block text-caption text-muted-foreground">đã bỏ ra</span>
                <span className="num block text-money-row">{formatMoney(r.paid)}</span>
              </span>
            </div>

            {/* Vạch so sánh giữa các người — dài nhất là người bỏ ra nhiều nhất.
                Con số đã nằm ngay trên nên vạch chỉ là thứ đọc nhanh, không phải
                thứ duy nhất mang tin. */}
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(2, Math.round((r.paid / peak) * 100))}%` }}
              />
            </div>

            <p className="text-caption text-muted-foreground">
              Phần phải chịu {formatMoney(r.share)}
              {advanced > 0 && ` · đang ứng cho cả nhóm ${formatMoney(advanced)}`}
              {advanced < 0 && ` · người khác đang ứng hộ ${formatMoney(-advanced)}`}
            </p>
          </div>
        );
      })}

      <p className="border-t border-border pt-3 text-body text-muted-foreground">
        Cả sổ chi <span className="num text-foreground">{formatMoney(totalExpense)}</span> trong
        khoảng này.
      </p>
    </div>
  );
}
