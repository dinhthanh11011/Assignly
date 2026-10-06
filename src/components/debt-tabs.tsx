import { Badge } from "@/components/ui/badge";
import { ChoiceGroupLinks } from "@/components/ui/choice-group";

export type DebtTab = "loans" | "shared";

/**
 * Hai tab của trang Nợ, đặt cạnh nhau để so được: "Mượn tiền" (người ngoài sổ)
 * và "Tiền chung" (người trong sổ, nợ tính ra từ chia tiền). Là <Link> nên mỗi
 * tab là một URL chia sẻ được; câu mô tả bên dưới nói hai tab khác nhau chỗ nào.
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
      key: "loans",
      // Ghi rõ `?view=loans` chứ không để `/loans` trơn: sổ chung mặc định mở tab
      // "Tiền chung", nên URL trơn không còn nghĩa là tab "Mượn tiền".
      href: "/loans?view=loans",
      label: "Mượn tiền",
      hint: "Tiền bạn cho người ngoài mượn, hoặc bạn mượn của người ta",
      badge: attentionCount || undefined,
    },
    {
      key: "shared",
      href: "/loans?view=shared",
      label: "Tiền chung",
      hint: "Tiền cả nhà tiêu chung — ai đã trả hộ ai",
    },
  ];

  // Sổ chung thì "Tiền chung" đứng trước: trong một sổ nhiều người, câu hỏi
  // thường trực là ai đã trả hộ ai cho các khoản tiêu chung, còn khoản mượn của
  // người ngoài sổ mới là việc lẻ. Sổ một người thì không có tab "Tiền chung".
  const shown = showShared
    ? [tabs.find((t) => t.key === "shared")!, tabs.find((t) => t.key === "loans")!]
    : tabs.filter((t) => t.key === "loans");
  const current = shown.find((t) => t.key === active) ?? shown[0];

  return (
    <div className="space-y-2">
      {shown.length > 1 && (
        <ChoiceGroupLinks
          label="Hai loại nợ"
          activeKey={active}
          items={shown.map((t) => ({
            key: t.key,
            href: t.href,
            label: t.label,
            badge: t.badge ? <Badge variant="warning">{t.badge}</Badge> : undefined,
          }))}
        />
      )}
      {/* Câu mô tả của tab đang mở — thứ thật sự dạy hai tab khác nhau chỗ nào. */}
      <p className="px-1 text-body text-muted-foreground">{current.hint}</p>
    </div>
  );
}
