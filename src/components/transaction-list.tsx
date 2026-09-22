"use client";
import { call } from "@/lib/action-result";
import { useMemo, useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UNKNOWN_AMOUNT_LONG,
  UNKNOWN_AMOUNT_SHORT,
  signedMoney,
} from "@/lib/copy";
import { useTransactionActions } from "@/components/transaction-actions";
import { type CategoryOption } from "@/components/transaction-dialog";
import { makeShortNamer, type MemberOption } from "@/lib/member";
import { loadTransactions } from "@/lib/actions";
import {
  categoryLabel,
  cn,
  dateKey,
  formatDayHeading,
  today,
} from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { moneyRowClass, rowLeadClass, rowTextClass, rowTrailClass } from "@/components/ui/row";

export type TransactionItem = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  /** Ghi trước lúc chưa biết bao nhiêu; `amount` khi đó là 0 — xem schema Prisma. */
  amountUnknown: boolean;
  date: Date;
  note: string | null;
  categories: { category: { id: string; name: string; icon: string | null } }[];
  createdBy: { id: string; name: string | null; email: string | null };
  paidById: string | null;
  paidBy: { id: string; name: string | null; email: string | null } | null;
  splits: { userId: string; weight: number; amount: number | null }[];
  /** Kiểu chia đã chọn lúc lưu; null ở khoản cũ — xem `Transaction.splitMode`. */
  splitMode: "EQUAL" | "WEIGHT" | "EXACT" | null;
};

/**
 * Ô SỐ TIỀN ở cuối một hàng, dùng chung cho danh sách chính, hàng chờ gửi và sheet
 * của một ngày — ba nơi có cùng bố cục hàng và phải nói cùng một kiểu.
 *
 * Khoản chưa điền tiền KHÔNG mượn cỡ chữ của số tiền (`text-money-row`): "Chưa rõ"
 * là hai TỪ, và ở cỡ đó nó rộng gần gấp đôi một con số bình thường rồi đè lên dòng
 * phụ bên cạnh trên màn hình điện thoại. Nó lấy cỡ nhãn + màu warning + icon "?" —
 * ba dấu hiệu đủ để đọc ra "đây là trạng thái có chủ ý", mà không giành chỗ của
 * thứ nó vốn không phải: một con số.
 *
 * Cũng vì thế mà dòng phụ KHÔNG nhắc lại "chưa điền tiền" nữa: ô này đã nói rồi,
 * và nói hai lần trên cùng một hàng chính là thứ làm hàng đó chật.
 */
export function TransactionAmount({
  amount,
  amountUnknown,
  type,
}: {
  amount: number;
  amountUnknown: boolean;
  type: "INCOME" | "EXPENSE";
}) {
  if (amountUnknown) {
    // `Badge` chứ không phải chữ trần tô màu: chữ trần ở cuối hàng nằm đúng chỗ mà
    // mắt đang chờ một CON SỐ, nên nó bị đọc như một con số hỏng. Cái khung chip
    // mới là thứ nói "đây là một nhãn trạng thái, không phải số tiền" — và app đã
    // có sẵn đúng hình dáng đó cho mọi trạng thái khác (nợ trễ hẹn, chờ duyệt…),
    // nên tự vẽ lại một cái na ná là thêm một dị bản nữa để lệch nhau về sau.
    return (
      <Badge variant="warning" className="shrink-0">
        <CircleHelp aria-hidden />
        {UNKNOWN_AMOUNT_SHORT}
      </Badge>
    );
  }
  return (
    <span
      className={cn(
        "num shrink-0 text-money-row",
        type === "INCOME" ? "text-income" : "text-expense",
      )}
    >
      {signedMoney(amount, type === "INCOME" ? "in" : "out")}
    </span>
  );
}

/**
 * RUỘT CHỮ CỦA MỘT HÀNG: tên loại, rồi dòng bối cảnh, rồi ghi chú.
 *
 * Bản cũ nối tất cả thành MỘT chuỗi ("Tiền ra · Nguyễn Thị Huế bỏ tiền · chia 2
 * người · giấy bạc, trứng") rồi `truncate`. Trên điện thoại chuỗi đó dài gấp
 * đôi chỗ có, nên phần bị "…" nuốt luôn là GHI CHÚ — thứ duy nhất trong chuỗi
 * mà người dùng tự tay gõ, và cũng là thứ duy nhất không đoán lại được từ chỗ
 * khác. Ba thứ mang tin khác nhau bị buộc vào cùng một ngân sách bề rộng, và
 * thứ quý nhất luôn đứng cuối hàng chờ.
 *
 * Nay tách hai dòng, mỗi dòng một ngân sách riêng:
 *   · dòng bối cảnh — ai bỏ tiền, chia mấy người (+ ngày ở bố cục phẳng). Ngắn
 *     lại nhờ tên gọi (xem `makeShortNamer`), nên gần như không còn phải cắt;
 *   · dòng ghi chú — được trọn bề rộng hàng và tối đa hai dòng (`line-clamp-2`),
 *     đủ cho "giấy bạc, trứng" lẫn những ghi chú dài hơn thế.
 *
 * CHIỀU TIỀN chỉ còn mũi tên + chữ cho máy đọc màn hình. Chữ "Tiền ra" trước
 * đây đứng đầu dòng để ai không phân biệt được màu vẫn đọc ra chiều tiền, nhưng
 * nó không phải dấu hiệu duy nhất không dựa vào màu: mũi tên lên/xuống là HÌNH
 * DÁNG, và dấu −/+ trong số tiền là KÝ TỰ. Cả hai đều đứng vững khi bỏ hết màu,
 * nên tám ký tự đó không đáng lấy chỗ của ghi chú. Sổ một mình thì không có
 * dòng "ai bỏ tiền" để thay thế, nên ở đó chữ vẫn hiện.
 */
export function TransactionRowText({
  t,
  shared,
  shortName,
  dateLabel,
}: {
  t: TransactionItem;
  shared: boolean;
  shortName: (m: { id: string; name: string | null; email: string | null }) => string;
  /** Ngày, chỉ truyền ở bố cục phẳng — nơi không còn tiêu đề ngày phía trên. */
  dateLabel?: string | null;
}) {
  const inbound = t.type === "INCOME";
  const payer = t.paidBy ?? t.createdBy;
  const context = [
    shared
      ? `${shortName(payer)} ${inbound ? "cầm tiền" : "bỏ tiền"}`
      : inbound
        ? "Tiền vào"
        : "Tiền ra",
    shared && t.splits.length > 1 ? `chia ${t.splits.length} người` : null,
    dateLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={rowTextClass}>
      <div className="truncate text-body-lg">{categoryLabel(t)}</div>
      {/* MỘT span chữ duy nhất, không phải bốn.
          Bản cũ xếp cạnh nhau "Tiền ra", ngày, rồi ghi chú — mỗi cái một
          <span shrink-0>. Không có phần tử nào co được thì cả dòng không
          co được: nó tràn ra khỏi khung `min-w-0` này (overflow mặc định
          là visible) và chạy thẳng vào ô bên phải. Với con số thì hai thứ
          chữ chồng lên nhau; với chip có NỀN thì chip vẽ đè và che mất
          chữ. `truncate` trên một trong bốn span không cứu được, vì ba
          span kia vẫn giữ nguyên bề rộng min-content của chúng.
          Nối thành một chuỗi thì chỉ còn MỘT thứ để co, và nó cắt bằng
          "…" đúng như mọi dòng chữ khác trong app. */}
      <div className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
        {inbound ? (
          <ArrowDownCircle className="size-4 shrink-0 text-income" />
        ) : (
          <ArrowUpCircle className="size-4 shrink-0 text-expense" />
        )}
        <span className="sr-only">{inbound ? "Tiền vào" : "Tiền ra"}</span>
        <span className="truncate">{context}</span>
      </div>
      {/* Ghi chú xuống dòng riêng và được cắt theo DÒNG chứ không theo ký tự:
          "giấy bạc, trứng" hay "tiền điện tháng 8 trả hộ chị Hà" đều hiện đủ,
          còn một ghi chú dài thật thì dừng ở hai dòng — hàng không phình ra
          đẩy những khoản khác xuống dưới màn hình. */}
      {t.note && (
        <div className="line-clamp-2 text-caption text-muted-foreground">{t.note}</div>
      )}
    </div>
  );
}

/** "Hôm nay" / "Hôm qua" cho hai ngày gần nhất, còn lại là thứ + ngày. */
function dayLabel(key: string) {
  const diff = Math.round(
    (today().getTime() - new Date(key + "T00:00:00Z").getTime()) / 86_400_000,
  );
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return formatDayHeading(key);
}

/**
 * Danh sách khoản nhóm theo ngày. Bấm một hàng là mở chi tiết khoản đó
 * (`TransactionDetailDialog`), và sửa/xoá đi ra từ trong chi tiết.
 */
export function TransactionList({
  groupId,
  categories,
  members,
  currentUserId,
  items: initialItems,
  nextCursor: initialCursor,
  filter,
  emptyText = "Chưa có khoản nào.",
  emptyAction,
  announceCount = true,
  grouped = true,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  items: TransactionItem[];
  nextCursor: string | null;
  filter: {
    month?: string;
    day?: string;
    type?: "INCOME" | "EXPENSE";
    categoryIds?: string[];
    q?: string;
  };
  emptyText?: string;
  /** Nút gợi ý việc tiếp theo, hiện trong ô trống. */
  emptyAction?: React.ReactNode;
  /**
   * Phát "N khoản" ra máy đọc màn hình. Bật ở danh sách CHÍNH, nơi đổi bộ lọc là
   * một lần điều hướng không tự báo gì cả (xem vùng aria-live bên dưới).
   *
   * Tắt ở danh sách phụ (khối "chưa điền số tiền"): hai vùng aria-live trên cùng
   * một trang thì mỗi lần đổi bộ lọc máy đọc phát ra hai con số liền nhau, và con
   * số thứ hai — vốn không liên quan gì tới bộ lọc — nghe như đang đếm cùng một
   * thứ. Khối đó đã có tiêu đề nói rõ số lượng bằng chữ.
   */
  announceCount?: boolean;
  /**
   * Gom theo ngày (mặc định) hay xếp phẳng. PHẢI là false khi danh sách không
   * còn sắp theo ngày — xem ghi chú ở nhánh phẳng bên dưới.
   */
  grouped?: boolean;
}) {
  const shared = members.length > 1;
  // Rút gọn tên phải biết CẢ sổ mới an toàn (trùng tên gọi), nên tính một lần ở
  // đây rồi truyền xuống từng hàng — xem `makeShortNamer`.
  const shortName = useMemo(
    () => makeShortNamer(members, currentUserId),
    [members, currentUserId],
  );
  // Trang đầu luôn đến từ server; các trang sau giữ ở client.
  const [older, setOlder] = useState<TransactionItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, start] = useTransition();
  // Chi tiết → sửa / xoá / điền tiền: cả chuỗi nằm trong `useTransactionActions`,
  // dùng chung với sheet của một ngày trên lịch.
  const actions = useTransactionActions({
    groupId,
    categories,
    members,
    currentUserId,
    onDeleted: (id) => setOlder((prev) => prev.filter((t) => t.id !== id)),
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    return [...initialItems, ...older].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [initialItems, older]);

  const days = useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    for (const t of items) {
      const key = dateKey(new Date(t.date));
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  function loadMore() {
    if (!cursor) return;
    start(async () => {
      try {
        const page = await call(loadTransactions(groupId, filter, cursor));
        setOlder((prev) => [
          ...prev,
          ...(page.items as unknown as TransactionItem[]),
        ]);
        setCursor(page.nextCursor);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState emoji="🧾" action={emptyAction}>
        {emptyText}
      </EmptyState>
    );
  }

  /* Vẽ MỘT hàng. Tách ra vì danh sách có hai bố cục: gom theo ngày (mặc định)
     và phẳng (khi sắp theo số tiền) — cùng một hàng, hai khung chứa. */
  function renderRow(t: TransactionItem, showDate: boolean) {
    const inbound = t.type === "INCOME";
    return (
      // CẢ HÀNG là một nút mở chi tiết — mục tiêu bấm rộng bằng màn
      // hình, không phải một cái "⋮" 44px ở góc phải.
      <button
        key={t.id}
        type="button"
        onClick={() => actions.open(t)}
        aria-label={`Xem chi tiết khoản ${categoryLabel(t)}, ${
          t.amountUnknown ? UNKNOWN_AMOUNT_LONG : signedMoney(t.amount, inbound ? "in" : "out")
        }`}
        className={moneyRowClass({ size: "tall" })}
      >
        {/* Icon và tên khoản là MỘT cụm không tách rời — xem rowLeadClass. */}
        <div className={rowLeadClass}>
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center self-start rounded-lg text-title",
              inbound ? "bg-income-surface" : "bg-sunken",
            )}
          >
            {t.categories[0]?.category.icon ?? (inbound ? "💵" : "📦")}
          </span>
          <TransactionRowText
            t={t}
            shared={shared}
            shortName={shortName}
            dateLabel={
              // Ở bố cục phẳng không còn tiêu đề ngày phía trên, nên ngày phải
              // nằm ngay trên hàng — nếu không danh sách mất hẳn chiều thời gian.
              showDate ? dayLabel(dateKey(new Date(t.date))) : null
            }
          />
        </div>
        {/* Số tiền và mũi tên đi CÙNG NHAU trong một cụm: khi hàng hẹp, cả
            cụm rớt xuống dòng dưới như một khối, thay vì mũi tên ở lại trên còn
            con số tụt xuống một mình. */}
        <span className={cn(rowTrailClass, "self-start")}>
          <TransactionAmount amount={t.amount} amountUnknown={t.amountUnknown} type={t.type} />
          {/* Mũi tên nói "bấm được, còn nữa ở trong" — luôn hiện, kể cả
              khi không rê chuột (điện thoại không có hover). */}
          <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Đổi bộ lọc / tháng / tìm kiếm là một lần điều hướng, mà điều hướng thì
          không tự báo gì cho máy đọc màn hình cả — thanh tiến trình ở đầu trang
          là tín hiệu THUẦN THỊ GIÁC. Vùng này nằm trong một component client ổn
          định qua các lần đổi searchParams, nên React reconcile nó thay vì mount
          lại, và thông báo mới thật sự được phát ra. */}
      {announceCount && (
        <p role="status" aria-live="polite" className="sr-only">
          {items.length} khoản
        </p>
      )}
      {grouped ? (
        days.map(([day, rows]) => {
          const net = rows.reduce(
            (s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount),
            0,
          );
          // Ngày mà MỌI khoản đều chưa điền tiền thì tổng tính ra đúng 0, và viên
          // "+0 ₫" ở đầu ngày là app khẳng định hôm đó không thu không chi gì —
          // ngược hẳn với những hàng ngay bên dưới nó. Nói thẳng ra là chưa rõ.
          const allUnknown = rows.every((t) => t.amountUnknown);
          return (
            <section key={day}>
              {/* Tiêu đề ngày dạng viên thuốc đục — nổi rõ khi dính trên đầu danh sách */}
              {/* flex-wrap: ở màn hẹp × cỡ chữ lớn, "Thứ Hai, 17/08" và
                  "−12.450.000 ₫" không cùng nằm được trên một dòng, và không
                  cái nào chịu cắt bớt — cả hai đều là thông tin. Không cho
                  xuống dòng thì mỗi viên tự ngắt chữ giữa chừng thành hai dòng
                  con, ra hai khối lệch nhau trông như hỏng. */}
              <div className="day-sticky flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1.5">
                <h2 className="surface-float rounded-lg px-3.5 py-1.5 text-label">
                  {dayLabel(day)}
                </h2>
                {allUnknown ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-sunken px-3 py-1.5 text-label text-muted-foreground">
                    <CircleHelp className="size-4" />
                    Chưa rõ số tiền
                  </span>
                ) : (
                  <span
                    className={cn(
                      "num inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label",
                      net >= 0
                        ? "bg-income-surface text-income"
                        : "bg-expense-surface text-expense",
                    )}
                  >
                    {net >= 0 ? (
                      <ArrowDownCircle className="size-4" />
                    ) : (
                      <ArrowUpCircle className="size-4" />
                    )}
                    {signedMoney(net, net >= 0 ? "in" : "out")}
                  </span>
                )}
              </div>

              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {rows.map((t) => renderRow(t, false))}
              </div>
            </section>
          );
        })
      ) : (
        /* SẮP THEO SỐ TIỀN THÌ KHÔNG ĐƯỢC GOM THEO NGÀY. Tiêu đề ngày kèm tổng
           ngày chỉ có nghĩa khi danh sách đang xếp theo ngày; giữ chúng lại thì
           thứ tự nhìn thấy âm thầm hết khớp với thứ tự vừa yêu cầu, và danh
           sách TRÔNG NHƯ HỎNG. Bố cục phẳng đưa ngày xuống từng hàng. */
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((t) => renderRow(t, true))}
        </div>
      )}

      {cursor && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={pending}
          aria-busy={pending}
          onClick={loadMore}
        >
          {pending ? "Đang tải…" : "Xem những khoản cũ hơn"}
        </Button>
      )}

      {actions.dialogs}
    </div>
  );
}
