import Link from "next/link";
import { cn } from "@/lib/utils";

export type DebtTab = "muon" | "chung";

/**
 * Hai tab của trang Nợ, đặt CẠNH NHAU có chủ ý.
 *
 * App có hai hệ thống nợ khác hẳn nhau về bản chất:
 *   · "Mượn tiền" — người kia là người NGOÀI sổ, tên gõ tay, có tiền gốc, có
 *     hẹn ngày trả, có lãi, có trạng thái đóng/mở.
 *   · "Tiền chung" — người kia là người TRONG sổ, số nợ là kết quả TÍNH RA từ
 *     việc chia tiền các khoản chung, không sửa trực tiếp được, chỉ đưa tiền
 *     cho nhau thì mới hết.
 *
 * Bản cũ để hai thứ này thành hai mục menu tách rời ("Vay nợ" và "Cân đối") và
 * dùng chung một bộ chữ ("còn phải thu / còn phải trả") cho cả hai — không ai
 * đoán ra được chúng khác nhau chỗ nào. Đặt cạnh nhau, mỗi tab một câu mô tả,
 * là dạy được sự khác biệt đó trong một cái liếc mắt, vĩnh viễn, không cần
 * hướng dẫn.
 *
 * Là <Link> chứ không phải tab client: server render thẳng, không cần state,
 * và mỗi tab là một URL chia sẻ / bookmark được (`/balance` cũ 308 về
 * `?xem=chung`).
 */
export function DebtTabs({
  active,
  attentionCount,
  showShared,
}: {
  active: DebtTab;
  /** Số khoản mượn cần nhắc — hiện ngay trên tab để không phải mở ra mới biết. */
  attentionCount: number;
  /** Sổ một người thì không có "tiền chung" nào để mà xem. */
  showShared: boolean;
}) {
  const tabs: { key: DebtTab; href: string; label: string; hint: string; badge?: number }[] = [
    {
      key: "muon",
      // Ghi rõ `?xem=muon` chứ không để `/loans` trơn: sổ chung mặc định mở tab
      // "Tiền chung", nên URL trơn không còn nghĩa là tab "Mượn tiền".
      href: "/loans?xem=muon",
      label: "Mượn tiền",
      hint: "Tiền bạn cho người ngoài mượn, hoặc bạn mượn của người ta",
      badge: attentionCount || undefined,
    },
    {
      key: "chung",
      href: "/loans?xem=chung",
      label: "Tiền chung",
      hint: "Tiền cả nhà tiêu chung — ai đã trả hộ ai",
    },
  ];

  // Sổ chung thì "Tiền chung" đứng trước: trong một sổ nhiều người, câu hỏi
  // thường trực là ai đã trả hộ ai cho các khoản tiêu chung, còn khoản mượn của
  // người ngoài sổ mới là việc lẻ. Sổ một người thì không có tab "Tiền chung".
  const shown = showShared
    ? [tabs.find((t) => t.key === "chung")!, tabs.find((t) => t.key === "muon")!]
    : tabs.filter((t) => t.key === "muon");
  const current = shown.find((t) => t.key === active) ?? shown[0];

  return (
    <div className="space-y-2">
      {shown.length > 1 && (
        <div className="flex gap-1.5 rounded-full border-[1.5px] border-border bg-sunken p-1.5">
          {shown.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.key === active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-body transition-colors",
                t.key === active
                  ? "bg-card font-bold text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.badge ? (
                <span className="rounded-full bg-warning-surface px-2 py-0.5 text-caption text-warning">
                  {t.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
      {/* Câu mô tả của tab đang mở — thứ thật sự dạy hai tab khác nhau chỗ nào. */}
      <p className="px-1 text-body text-muted-foreground">{current.hint}</p>
    </div>
  );
}
