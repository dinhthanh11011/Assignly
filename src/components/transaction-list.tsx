"use client";
import { call } from "@/lib/action-result";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  CircleHelp,
  FunnelX,
  ReceiptText,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Amount } from "@/components/ui/amount";
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
  /**
   * Bản của khoản này lúc trang được vẽ. Đi kèm mọi lệnh sửa/xoá để server từ
   * chối nếu người khác đã động vào trong lúc đó — xem `Transaction.version`.
   */
  version: number;
};

/**
 * Ô SỐ TIỀN ở cuối một hàng — dùng chung cho danh sách chính, hàng chờ gửi và
 * sheet của một ngày.
 *
 * Khoản chưa điền tiền là một CHIP trạng thái (Badge warning + "?"), không phải
 * chữ trần đứng đúng chỗ mắt chờ một con số.
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
    return (
      <Badge variant="warning" className="shrink-0">
        <CircleHelp aria-hidden />
        {UNKNOWN_AMOUNT_SHORT}
      </Badge>
    );
  }
  return (
    <Amount
      value={type === "INCOME" ? amount : -amount}
      tone={type === "INCOME" ? "income" : "expense"}
      size="row"
      icon
      className="shrink-0"
    />
  );
}

/** Ô vuông đầu hàng: emoji của loại chính trong một ô bo đều (emoji là dữ liệu người dùng). */
export function CategoryTile({ t, className }: { t: TransactionItem; className?: string }) {
  const inbound = t.type === "INCOME";
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center self-start rounded-xl text-title leading-none",
        inbound ? "bg-income-surface" : "bg-sunken",
        className,
      )}
    >
      {t.categories[0]?.category.icon ?? (inbound ? "💵" : "📦")}
    </span>
  );
}

/**
 * RUỘT CHỮ CỦA MỘT HÀNG: tên loại · dòng bối cảnh (ai trả, chia mấy người, ngày
 * ở bố cục phẳng) · ghi chú.
 *
 * Ghi chú có dòng riêng, cắt theo DÒNG (tối đa 2): đó là thứ duy nhất người
 * dùng tự gõ, không được để "…" nuốt mất. Dòng bối cảnh là MỘT chuỗi duy nhất
 * để chỉ có một thứ co lại — nhiều span shrink-0 cạnh nhau sẽ tràn sang ô số tiền.
 * Chiều tiền đã có ở dấu +/− và mũi tên của số tiền; ở đây chỉ còn bản sr-only.
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
      <div className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
        <span className="sr-only">{inbound ? "Tiền vào" : "Tiền ra"}</span>
        <span className="truncate">{context}</span>
      </div>
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

const EMPTY_ICONS = { receipt: ReceiptText, search: SearchX, filter: FunnelX } as const;

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
  emptyTitle,
  emptyIcon = "receipt",
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
    /** Phải đi kèm, nếu không trang sau đọc theo thứ tự khác trang đầu. */
    sort?: "moi" | "cu" | "nhieu";
  };
  emptyText?: string;
  /** Dòng đậm của ô trống. */
  emptyTitle?: string;
  /** Icon lucide của ô trống. */
  /** Tên icon chứ không phải component: trang server không truyền được hàm
   *  sang client component ("Functions cannot be passed directly…"). */
  emptyIcon?: keyof typeof EMPTY_ICONS;
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

  /* Trang đầu vừa đổi (`router.refresh` của LiveRefresh, hay `revalidatePath` sau
     một lần ghi) thì các trang sau đang giữ ở client đã lệch với nó: có N khoản
     mới chen lên đầu là N khoản ở ranh giới trang 1/trang 2 bị đẩy ra khỏi trang
     đầu mà trang 2 cũ thì chưa có — chúng biến mất khỏi màn hình. Khoản người
     khác vừa sửa/xoá trong các trang sau cũng vẫn hiện bản cũ.

     Chữa: nạp lại ĐÚNG ngần ấy khoản ngay sau trang đầu mới, một lượt. Danh sách
     không co lại (chỗ đang cuộn không nhảy), và liền mạch với trang đầu. */
  const soDaTai = useRef(0);
  useEffect(() => {
    soDaTai.current = older.length;
  }, [older]);
  const lanDau = useRef(true);
  useEffect(() => {
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    const n = soDaTai.current;
    if (n === 0) return;
    let cu = false;
    void (async () => {
      if (!initialCursor) {
        // Trang đầu mới đã chứa hết: không còn gì ở sau nó.
        setOlder([]);
        setCursor(null);
        return;
      }
      const res = await loadTransactions(groupId, filter, initialCursor, Math.min(n, 500));
      // Lỗi thì giữ nguyên thứ đang hiện: lệch vài dòng còn hơn trắng cả đoạn.
      if (cu || !res.ok) return;
      setOlder(res.data.items as unknown as TransactionItem[]);
      setCursor(res.data.nextCursor);
    })();
    return () => {
      cu = true;
    };
  }, [initialItems, initialCursor, groupId, filter]);

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

  /* Nhãn nút tải tiếp phải NÓI ĐÚNG thứ nó sắp mang về. Danh sách đọc theo ba
     thứ tự khác nhau, nên "cũ hơn" chỉ đúng ở một trong ba: khi đang sắp "Cũ
     nhất" thì trang sau là những khoản MỚI hơn, còn khi sắp theo số tiền thì
     nó chẳng liên quan gì tới thời gian cả. Một nhãn cố định làm người dùng
     tưởng mình vừa bấm nhầm khi danh sách dài thêm về phía ngược lại. */
  const moreLabel =
    filter.sort === "cu"
      ? "Xem những khoản mới hơn"
      : filter.sort === "nhieu"
        ? "Xem những khoản nhỏ hơn"
        : "Xem những khoản cũ hơn";

  if (items.length === 0) {
    return (
      <EmptyState icon={EMPTY_ICONS[emptyIcon]} title={emptyTitle} action={emptyAction}>
        {emptyText}
      </EmptyState>
    );
  }

  /* MỘT hàng — dùng cho cả bố cục gom theo ngày và bố cục phẳng (sắp theo số
     tiền, khi đó ngày xuống từng hàng). CẢ HÀNG là nút mở chi tiết. */
  function renderRow(t: TransactionItem, showDate: boolean) {
    const inbound = t.type === "INCOME";
    return (
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
          <CategoryTile t={t} />
          <TransactionRowText
            t={t}
            shared={shared}
            shortName={shortName}
            dateLabel={showDate ? dayLabel(dateKey(new Date(t.date))) : null}
          />
        </div>
        {/* Số tiền + mũi tên là một cụm: hàng hẹp thì cả cụm rớt xuống dòng. */}
        <span className={cn(rowTrailClass, "self-start pt-0.5")}>
          <TransactionAmount amount={t.amount} amountUnknown={t.amountUnknown} type={t.type} />
          <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
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
          // Ngày chỉ toàn khoản chưa điền tiền: tổng 0 là sai, nói thẳng "chưa rõ".
          const allUnknown = rows.every((t) => t.amountUnknown);
          return (
            <section key={day} aria-labelledby={`day-${day}`}>
              {/* Tiêu đề ngày dính khi cuộn: viên ngày (kèm số khoản) bên trái,
                  viên tổng ngày bên phải; hẹp thì viên tổng xuống dòng. */}
              <div className="day-sticky flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1.5">
                <h2 id={`day-${day}`} className="surface-float rounded-lg px-3.5 py-1.5 text-label">
                  {dayLabel(day)}
                  <span className="ml-1.5 font-normal text-muted-foreground">· {rows.length} khoản</span>
                </h2>
                {allUnknown ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-sunken px-3 py-1.5 text-label text-muted-foreground">
                    <CircleHelp className="size-4" aria-hidden />
                    Chưa rõ số tiền
                  </span>
                ) : (
                  <span
                    className={cn(
                      "num inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label",
                      net >= 0 ? "bg-income-surface text-income" : "bg-expense-surface text-expense"
                    )}
                  >
                    {net >= 0 ? (
                      <ArrowDownCircle className="size-4" aria-hidden />
                    ) : (
                      <ArrowUpCircle className="size-4" aria-hidden />
                    )}
                    <span className="sr-only">Cả ngày: </span>
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
          {pending ? "Đang tải…" : moreLabel}
        </Button>
      )}

      {actions.dialogs}
    </div>
  );
}
