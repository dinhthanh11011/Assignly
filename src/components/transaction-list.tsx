"use client";
import { useMemo, useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  UNKNOWN_AMOUNT_LONG,
  UNKNOWN_AMOUNT_SHORT,
  signedMoney,
  transactionAmountText,
} from "@/lib/copy";
import { TransactionDetailDialog } from "@/components/transaction-detail";
import { FillAmountDialog } from "@/components/fill-amount-dialog";
import {
  EditTransactionDialog,
  type CategoryOption,
  type EditableTransaction,
} from "@/components/transaction-dialog";
import { memberLabel, type MemberOption } from "@/lib/member";
import { deleteTransaction, loadTransactions } from "@/lib/actions";
import {
  categoryLabel,
  cn,
  dateKey,
  formatDayHeading,
  formatDate,
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

/** Dòng phụ dưới tên loại: ai bỏ tiền, chia mấy người, rồi tới ghi chú. */
function subtitle(t: TransactionItem, shared: boolean) {
  if (!shared) return t.note || t.createdBy.name || t.createdBy.email || "";
  const payer = t.paidBy ?? t.createdBy;
  const parts = [
    `${memberLabel({ ...payer, image: null })} ${t.type === "INCOME" ? "cầm tiền" : "bỏ tiền"}`,
  ];
  if (t.splits.length > 1) parts.push(`chia ${t.splits.length} người`);
  if (t.note) parts.push(t.note);
  return parts.join(" · ");
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
    categoryId?: string;
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
  // Trang đầu luôn đến từ server; các trang sau giữ ở client.
  const [older, setOlder] = useState<TransactionItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, start] = useTransition();
  const [detail, setDetail] = useState<TransactionItem | null>(null);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [deleting, setDeleting] = useState<TransactionItem | null>(null);
  const [filling, setFilling] = useState<TransactionItem | null>(null);

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
        const page = await loadTransactions(groupId, filter, cursor);
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
        onClick={() => setDetail(t)}
        aria-label={`Xem chi tiết khoản ${categoryLabel(t)}, ${
          t.amountUnknown ? UNKNOWN_AMOUNT_LONG : signedMoney(t.amount, inbound ? "in" : "out")
        }`}
        className={moneyRowClass({ size: "tall" })}
      >
        {/* Icon và tên khoản là MỘT cụm không tách rời — xem rowLeadClass. */}
        <div className={rowLeadClass}>
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-lg text-title",
              inbound ? "bg-income-surface" : "bg-sunken",
            )}
          >
            {t.categories[0]?.category.icon ?? (inbound ? "💵" : "📦")}
          </span>
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
              {/* Dấu hiệu thứ ba: một TỪ (trong chuỗi bên cạnh). Cùng với dấu
                  +/− và mũi tên này, thu vs chi vẫn đọc ra được khi bỏ màu. */}
              {inbound ? (
                <ArrowDownCircle className="size-4 shrink-0 text-income" />
              ) : (
                <ArrowUpCircle className="size-4 shrink-0 text-expense" />
              )}
              <span className="truncate">
                {[
                  inbound ? "Tiền vào" : "Tiền ra",
                  // Ở bố cục phẳng không còn tiêu đề ngày phía trên, nên ngày
                  // phải nằm ngay trên hàng — nếu không danh sách mất hẳn chiều
                  // thời gian.
                  showDate ? dayLabel(dateKey(new Date(t.date))) : null,
                  subtitle(t, shared) || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
        </div>
        {/* Số tiền và mũi tên đi CÙNG NHAU trong một cụm: khi hàng hẹp, cả
            cụm rớt xuống dòng dưới như một khối, thay vì mũi tên ở lại trên còn
            con số tụt xuống một mình. */}
        <span className={rowTrailClass}>
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

      {/* Chi tiết mở trước, sửa/xoá đi ra từ đó. Đóng sheet chi tiết TRƯỚC khi
          mở sheet kế tiếp: hai dialog cùng mở thì Radix khoá tiêu điểm ở cái cũ
          và cái mới không bấm được. */}
      {detail && (
        <TransactionDetailDialog
          transaction={detail}
          members={members}
          currentUserId={currentUserId}
          open
          onOpenChange={(o) => !o && setDetail(null)}
          onFill={() => {
            setFilling(detail);
            setDetail(null);
          }}
          onEdit={() => {
            setEditing({
              id: detail.id,
              type: detail.type,
              amount: detail.amount,
              amountUnknown: detail.amountUnknown,
              date: new Date(detail.date),
              categoryIds: detail.categories.map((c) => c.category.id),
              note: detail.note,
              paidById: detail.paidById,
              splits: detail.splits,
            });
            setDetail(null);
          }}
          onDelete={() => {
            setDeleting(detail);
            setDetail(null);
          }}
        />
      )}

      {/* Xoá một khoản là mất hẳn, không hoàn lại được — phải hỏi, và phải nói
          rõ đang xoá khoản nào. Bản cũ xoá thẳng khi bấm vào mục trong menu. */}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Xoá khoản ${categoryLabel(deleting)}?`}
          description={`${transactionAmountText(deleting)} ngày ${formatDate(deleting.date)} sẽ bị xoá hẳn, không lấy lại được.`}
          confirmLabel="Xoá khoản này"
          successMessage="Đã xoá khoản này"
          onConfirm={async () => {
            await deleteTransaction(deleting.id);
            setOlder((prev) => prev.filter((t) => t.id !== deleting.id));
          }}
        />
      )}

      {/* Điền tiền đi ra từ chi tiết, y như sửa và xoá — cùng một chỗ cho mọi việc
          làm với một khoản. */}
      {filling && (
        <FillAmountDialog
          transaction={filling}
          members={members}
          currentUserId={currentUserId}
          open
          onOpenChange={(o) => !o && setFilling(null)}
        />
      )}

      {editing && (
        <EditTransactionDialog
          groupId={groupId}
          categories={categories}
          members={members}
          currentUserId={currentUserId}
          transaction={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
