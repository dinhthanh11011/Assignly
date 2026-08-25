"use client";
import { useMemo, useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmountField } from "@/components/money-input";
import { DateField, DayQuickPicks } from "@/components/date-field";
import { FieldError, useValidation } from "@/components/field";
import { ChoiceGroup } from "@/components/ui/choice-group";
import {
  PayerPicker,
  SplitEditor,
  defaultSplitState,
  splitStateFrom,
  splitStateToPayload,
  type SplitState,
} from "@/components/split-editor";
import { type MemberOption } from "@/lib/member";
import { IconPicker } from "@/components/icon-picker";
import { createCategory, createTransaction, updateTransaction } from "@/lib/actions";
import { enqueuePending, isOfflineError, newClientId } from "@/lib/offline-queue";
import { cn, dateKey, daysFromToday, formatDate, todayKey } from "@/lib/utils";

export type CategoryOption = {
  id: string;
  name: string;
  icon: string | null;
  type: "INCOME" | "EXPENSE";
};

type TxType = "INCOME" | "EXPENSE";

/** Những gì form nặn ra khi bấm lưu — phần chung của cả ghi mới lẫn sửa. */
export type TransactionFormPayload = {
  type: TxType;
  amount: number;
  /** Chưa biết bao nhiêu, điền sau. `amount` khi đó là 0 — xem schema Prisma. */
  amountUnknown: boolean;
  date: string;
  categoryIds: string[];
  note: string | null;
  paidById?: string;
  splits?: { userId: string; weight: number; amount: number | null }[];
};

export type EditableTransaction = {
  id: string;
  type: TxType;
  amount: number;
  amountUnknown: boolean;
  date: Date;
  /** Theo đúng thứ tự đã chọn — phần tử đầu là loại chính. */
  categoryIds: string[];
  note: string | null;
  paidById: string | null;
  splits: { userId: string; weight: number; amount: number | null }[];
};

/**
 * Lưới chọn loại: chọn được nhiều loại cho một khoản, và tạo nhanh
 * loại mới ngay tại đây (loại vừa tạo được chọn luôn).
 */
function CategoryPicker({
  groupId,
  type,
  categories,
  value,
  onChange,
  onCreated,
}: {
  groupId: string;
  type: TxType;
  categories: CategoryOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  onCreated: (category: CategoryOption) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(type === "INCOME" ? "💰" : "📦");
  const [pending, start] = useTransition();

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function create() {
    const trimmed = name.trim();
    // `pending` chặn bấm/Enter lần hai khi lần đầu chưa xong: hai lời gọi song
    // song đều lọt qua bước kiểm tra trùng tên ở server, và cái tới sau đâm vào
    // unique index rồi văng lỗi Prisma thô ra toast.
    if (!trimmed || pending) return;
    start(async () => {
      try {
        const created = await createCategory({ groupId, name: trimmed, type, icon });
        onCreated(created);
        setName("");
        setAdding(false);
        toast.success("Đã thêm loại");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    // role="group" chứ không phải <Label>: ở đây không có MỘT control nào để
    // htmlFor trỏ tới — đó là một lưới nút bấm. <Label> trần trước đây là nhãn
    // không gắn với gì cả, nên máy đọc màn hình không nối được câu hỏi với lưới,
    // và câu giải thích "loại số 1 là loại chính" cũng không được đọc ra.
    <div
      role="group"
      aria-labelledby="tx-category-label"
      aria-describedby="tx-category-hint"
      className="space-y-2"
    >
      <Label asChild>
        <span id="tx-category-label">Khoản này là gì?</span>
      </Label>
      {/* Thứ tự bấm QUAN TRỌNG: loại bấm đầu tiên là loại chính, và nó là cái
          hiện ra ở danh sách. Bản cũ chỉ đánh số mà không nói vì sao. */}
      <p id="tx-category-hint" className="text-caption text-muted-foreground">
        {value.length > 1
          ? `Đã chọn ${value.length} loại — loại số 1 là loại chính.`
          : "Bấm được nhiều loại nếu khoản này gồm nhiều thứ."}
      </p>

      {/* Mobile: không cuộn lồng nhau — để cả sheet cuộn, đỡ kẹt ngón tay. */}
      <div className="-mx-1 grid grid-cols-4 gap-1.5 px-1 pb-1 sm:max-h-48 sm:grid-cols-5 sm:overflow-y-auto">
        {categories.map((c) => {
          const order = value.indexOf(c.id);
          const on = order >= 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              aria-pressed={on}
              className={cn(
                "relative flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-center text-caption leading-tight transition-all",
                // Đã chọn phải nhìn phát biết ngay: nền đặc + viền đậm, không
                // chỉ tô nhạt (user báo nhạt quá, tưởng chưa bấm được).
                on
                  ? "border-primary bg-primary font-semibold text-primary-foreground shadow-sm ring-2 ring-primary/25"
                  : "border-transparent bg-sunken text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Dấu tick cho biết đã chọn; nhiều loại thì đánh số để thấy rõ
                  đâu là loại chính */}
              {on && (
                <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-caption font-bold text-primary">
                  {value.length > 1 ? order + 1 : <Check className="size-3.5" strokeWidth={3} />}
                </span>
              )}
              <span className="text-title leading-none">{c.icon ?? "📁"}</span>
              <span className="line-clamp-2 break-words">{c.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border px-1 py-2 text-center text-caption leading-tight text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-5" />
          <span>Thêm loại mới</span>
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-lg bg-sunken p-3">
          <div className="flex gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-title">
              {icon}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "INCOME" ? "VD: Lương" : "VD: Ăn uống"}
              autoFocus
              className="bg-card"
              // Enter ở đây là "lưu loại", không phải gửi cả khoản.
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                create();
              }}
            />
            <Button
              type="button"
              size="icon"
              disabled={pending}
              onClick={create}
              aria-label="Lưu loại"
            >
              <Check />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setAdding(false)}
              aria-label="Thôi, không thêm nữa"
            >
              <X />
            </Button>
          </div>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      )}

      {categories.length === 0 && !adding && (
        <p className="text-body text-muted-foreground">
          Chưa có loại nào — bấm “Thêm loại mới” để tạo.
        </p>
      )}
    </div>
  );
}

export function TransactionForm({
  groupId,
  categories,
  members,
  currentUserId,
  initial,
  defaultType,
  defaultDate,
  saveOverride,
  onDone,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  initial?: EditableTransaction;
  /** Đã chọn "Tôi tiêu tiền"/"Tôi nhận tiền" ở màn trước → bỏ luôn nút gạt ở đây. */
  defaultType?: TxType;
  /** Ngày đặt sẵn khi ghi mới, "2026-08-05" — VD mở từ một ô lịch. */
  defaultDate?: string;
  /**
   * Lưu đi đâu đó KHÔNG PHẢI server — hiện chỉ có một chỗ: khoản còn nằm trong
   * hàng chờ gửi, sửa xong thì ghi lại vào IndexedDB chứ không gọi
   * `updateTransaction` (nó chưa có id trên server để mà sửa).
   */
  saveOverride?: (payload: TransactionFormPayload) => Promise<void>;
  onDone: () => void;
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? defaultType ?? "EXPENSE");
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [amountUnknown, setAmountUnknown] = useState(initial?.amountUnknown ?? false);
  const [date, setDate] = useState(initial ? dateKey(initial.date) : defaultDate || todayKey());
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  // Loại vừa tạo ngay trong form — props `categories` chỉ mới lại sau khi
  // trang tải lại, nên giữ thêm ở đây để chọn được liền.
  const [added, setAdded] = useState<CategoryOption[]>([]);
  const [note, setNote] = useState(initial?.note ?? "");
  const [split, setSplit] = useState<SplitState>(() =>
    initial
      ? splitStateFrom(members, initial.paidById ?? currentUserId, initial.splits)
      : defaultSplitState(members, currentUserId)
  );
  const [pending, start] = useTransition();
  // Số khoản đã ghi mà KHÔNG đóng form — xem `saveAndContinue`.
  const [savedCount, setSavedCount] = useState(0);
  const { errors, check, clear } = useValidation<"tx-amount" | "date" | "tx-split">();

  // Tạo loại xong, server revalidate → props `categories` lần sau đã có loại đó,
  // nhưng `added` vẫn giữ bản cũ nên lưới hiện HAI ô giống hệt nhau (và bấm ô
  // thứ hai thì toggle mất lựa chọn của ô thứ nhất). Gộp theo id, bản từ props
  // thắng vì nó mới hơn — tên/icon có thể vừa được sửa ở màn quản lý loại.
  const visible = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    for (const c of added) if (!byId.has(c.id)) byId.set(c.id, c);
    return [...byId.values()].filter((c) => c.type === type);
  }, [categories, added, type]);
  // Sổ một người thì không có gì để chia — để server tự mặc định chia đều.
  const shared = members.length > 1;
  // "hôm nay" / "hôm qua" / "ngày 20/08/2026" — dùng trong dòng đếm ở chân form.
  // Xa hơn hôm kia thì gọi thẳng con số: "cho 9 ngày trước" đọc như một khoảng
  // thời gian chứ không như một ngày cụ thể.
  const dayDiff = date ? daysFromToday(date) : NaN;
  const dayName =
    dayDiff === 0
      ? "hôm nay"
      : dayDiff === -1
        ? "hôm qua"
        : dayDiff === -2
          ? "hôm kia"
          : date
            ? `ngày ${formatDate(date)}`
            : "ngày đã chọn";

  /**
   * Ghi xong một khoản mà KHÔNG đóng form: dọn số tiền, loại và ghi chú, nhưng
   * GIỮ NGUYÊN ngày, chiều thu/chi, người trả và cách chia.
   *
   * Đây là phần trả lời cho "ghi nhiều khoản một lượt". Trước đây mỗi khoản là
   * một vòng đầy đủ: bấm nút nổi → chọn lại "tiêu tiền/nhận tiền" → và nếu đang
   * ghi bù cho hôm qua thì phải chỉnh lại ngày, LẦN NÀO CŨNG PHẢI, vì form mở ra
   * luôn mặc định hôm nay. Ba khoản của tối qua là ba lần chỉnh ngày, tức ba lần
   * có cơ hội lăn nhầm.
   *
   * Cách chia theo SỐ TIỀN cụ thể thì không mang sang được — số tiền vừa bị dọn
   * nên mấy con số đó mất nghĩa; đưa về chia đều, y như lúc bật "chưa biết tổng".
   */
  function continueEntry() {
    setSavedCount((n) => n + 1);
    setAmount(0);
    setAmountUnknown(false);
    setCategoryIds([]);
    setNote("");
    setSplit((prev) => (prev.mode === "EXACT" ? { ...prev, mode: "EQUAL", exact: {} } : prev));
    // Đợi React vẽ lại form đã dọn rồi mới đưa ô tiền vào tầm nhìn — ô tiền nằm
    // trên đầu form, mà người dùng vừa bấm nút ở tận đáy.
    requestAnimationFrame(() => {
      const el = document.getElementById("tx-amount");
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      (el as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }

  /** `again` = "Ghi & tiếp tục": lưu xong ở lại form thay vì đóng. */
  function save(again: boolean) {
    // Server coi splits rỗng là "chia đều cho cả sổ", nên phải chặn ở đây kẻo
    // người dùng để trống hết ở chế độ "Số tiền" lại thành chia đều mà không hay.
    const splits = shared ? splitStateToPayload(split) : [];
    if (
      !check([
        {
          field: "tx-amount",
          // Chọn "chưa biết bao nhiêu" thì KHÔNG có luật nào để mà sai — đó chính
          // là cả điểm của lựa chọn đó. Bỏ điều kiện này ra là tính năng chết ngay
          // ở nút Lưu, mà lỗi lại chỉ trỏ vào một ô nhập không còn trên màn hình.
          invalid: !amountUnknown && amount <= 0,
          message: "Nhập số tiền lớn hơn 0",
        },
        { field: "date", invalid: !date, message: "Chọn ngày" },
        {
          field: "tx-split",
          invalid: shared && splits.length === 0,
          message: "Chọn ít nhất một người để chia tiền",
        },
      ])
    )
      return;
    start(async () => {
      const payload: TransactionFormPayload = {
        type,
        // Server tự đưa về 0 khi `amountUnknown`, nhưng gửi 0 luôn từ đây để bản
        // nằm trong hàng chờ ngoại tuyến (nó được vẽ ra thẳng từ payload này) không
        // hiện một con số mà người dùng chưa từng xác nhận.
        amount: amountUnknown ? 0 : amount,
        amountUnknown,
        date,
        categoryIds,
        note: note.trim() || null,
        ...(shared ? { paidById: split.paidById, splits } : {}),
      };
      try {
        if (saveOverride) {
          await saveOverride(payload);
          toast.success("Đã sửa khoản này");
          onDone();
          return;
        }
        if (initial) await updateTransaction(initial.id, payload);
        else await createTransaction({ groupId, ...payload });
        toast.success(initial ? "Đã cập nhật khoản" : "Đã ghi khoản");
        if (again) continueEntry();
        else onDone();
      } catch (err) {
        // MẤT MẠNG THÌ KHÔNG ĐƯỢC LÀM MẤT KHOẢN. Giữ lại trong máy rồi tự gửi
        // sau — xem `src/lib/offline-queue.ts`.
        //
        // Chỉ làm được cho khoản GHI MỚI. Sửa một khoản thì phải biết bản trên
        // server đang là gì mới nhập lại được, mà lúc mất mạng thì không biết —
        // xếp hàng một bản sửa mù là cách âm thầm ghi đè thay đổi của người khác
        // trong sổ chung. Nên sửa lúc mất mạng vẫn báo lỗi như cũ.
        if (!initial && isOfflineError(err)) {
          const primary = visible.find((c) => c.id === categoryIds[0]);
          const clientId = newClientId();
          try {
            await enqueuePending({
              clientId,
              groupId,
              savedAt: Date.now(),
              label: primary?.name ?? (type === "INCOME" ? "Tiền vào" : "Tiền ra"),
              icon: primary?.icon ?? null,
              payload: { groupId, clientId, ...payload },
            });
            toast.success("Đã lưu trong máy, sẽ tự gửi khi có mạng");
            if (again) continueEntry();
            else onDone();
            return;
          } catch {
            toast.error("Máy không lưu tạm được. Thử lại khi có mạng.");
            return;
          }
        }
        toast.error((err as Error).message);
      }
    });
  }

  return (
    // Form chiếm hết chiều cao sheet: phần nhập cuộn, nút lưu luôn thấy được.
    // noValidate: constraint validation gốc chạy TRƯỚC onSubmit và hiện bong
    // bóng tiếng Anh của hệ điều hành — nó sẽ chặn mọi luật inline bên dưới.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      noValidate className="flex min-h-0 flex-1 flex-col gap-5">
      <DialogBody className="space-y-5">
        {/* Đổi chiều thì bỏ loại đang chọn, vì loại gắn với chi hay thu.
            Chỉ hiện khi SỬA: lúc ghi mới, chiều đã chọn ở màn trước rồi. */}
        {initial && (
          <ChoiceGroup
            label="Khoản này là tiền ra hay tiền vào?"
            value={type}
            onChange={(v) => {
              setType(v as TxType);
              setCategoryIds([]);
            }}
            options={[
              { value: "EXPENSE", label: "Tiền ra", tone: "expense" },
              { value: "INCOME", label: "Tiền vào", tone: "income" },
            ]}
          />
        )}

        <div className="space-y-2">
          <AmountField
            id="tx-amount"
            value={amount}
            onValueChange={(v) => {
              setAmount(v);
              clear("tx-amount");
            }}
            type={type}
            autoFocus
            invalid={Boolean(errors["tx-amount"])}
            describedBy={errors["tx-amount"] && "tx-amount-error"}
            amountUnknown={amountUnknown}
            onAmountUnknownChange={(next) => {
              setAmountUnknown(next);
              clear("tx-amount");
              // Đang chia bằng SỐ TIỀN cụ thể mà chuyển sang "chưa biết tổng" thì
              // cách chia đó mất nghĩa, và server sẽ từ chối nó. Đưa về chia đều
              // ngay tại đây — người dùng thấy cách chia đổi cùng lúc với cái họ
              // vừa bấm, thay vì nhận một lỗi lúc bấm Lưu về một chế độ đã bị ẩn.
              if (next) setSplit((prev) => (prev.mode === "EXACT" ? { ...prev, mode: "EQUAL" } : prev));
            }}
          />
          <FieldError id="tx-amount-error">{errors["tx-amount"]}</FieldError>
        </div>

        {/* NGÀY ĐỨNG NGAY SAU SỐ TIỀN, không còn nằm cuối form cạnh ô ghi chú.
            Ở dưới đáy nó vừa khuất (phải cuộn qua cả lưới loại và phần chia mới
            thấy) vừa đọc như một chi tiết phụ — trong khi ghi bù cho hôm qua thì
            ngày mới là thứ phải sửa TRƯỚC, và sửa sau khi đã điền hết thì rất dễ
            bấm Lưu mà quên mất.
            Ô ngày cần tối thiểu ~12rem cho ruột do trình duyệt vẽ; `sm:max-w-sm`
            chặn đầu kia để trên desktop nó không kéo dài hết bề ngang sheet. */}
        <DateField
          id="date"
          label="Ngày"
          value={date}
          onChange={(v) => {
            setDate(v);
            clear("date");
          }}
          required
          showRelative
          className="sm:max-w-sm"
          invalid={Boolean(errors.date)}
          error={<FieldError id="date-error">{errors.date}</FieldError>}
        >
          <DayQuickPicks
            value={date}
            onChange={(v) => {
              setDate(v);
              clear("date");
            }}
          />
        </DateField>

        <CategoryPicker
          groupId={groupId}
          type={type}
          categories={visible}
          value={categoryIds}
          onChange={setCategoryIds}
          onCreated={(c) => {
            setAdded((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c]));
            setCategoryIds((prev) => (prev.includes(c.id) ? prev : [...prev, c.id]));
          }}
        />

        {/* Ai bỏ tiền ra: trường riêng, luôn hiện, đứng TRƯỚC phần chia. Người
            đang ghi không nhất thiết là người trả — xem PayerPicker. */}
        {shared && (
          <PayerPicker
            members={members}
            type={type}
            value={split.paidById}
            currentUserId={currentUserId}
            onChange={(paidById) => setSplit((prev) => ({ ...prev, paidById }))}
          />
        )}

        {shared && (
          // tabIndex={-1} trên khung bọc: SplitEditor không phải một control đơn
          // nên không có gì focus được, mà check() cần focus được thì mới cuộn
          // người dùng tới đúng chỗ sai. Không có dòng này thì lỗi "chưa chọn ai
          // để chia" hiện ra ở một nơi ngoài màn hình, y như bản toast cũ.
          <div id="tx-split" tabIndex={-1} className="space-y-2 outline-none">
            <SplitEditor
              members={members}
              type={type}
              amount={amount}
              amountUnknown={amountUnknown}
              value={split}
              onChange={(v) => {
                setSplit(v);
                clear("tx-split");
              }}
            />
            <FieldError id="tx-split-error">{errors["tx-split"]}</FieldError>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="note">Ghi chú (không bắt buộc)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: cà phê với khách"
          />
        </div>
      </DialogBody>

      <DialogFooter className="flex-col gap-2 sm:flex-col">
        {/* Đếm số khoản đã ghi trong lượt này — và nhắc lại NGÀY đang ghi vào.
            Sau khi form dọn sạch, thứ duy nhất còn phân biệt "đang ghi cho hôm
            qua" với "đang ghi cho hôm nay" là con số trong ô ngày ở tận trên
            đầu; câu này nói lại điều đó ngay cạnh nút bấm. */}
        {savedCount > 0 && (
          <p className="flex items-center gap-1.5 text-caption text-income">
            <Check className="size-4 shrink-0" aria-hidden />
            Đã ghi {savedCount} khoản cho {dayName}. Ghi tiếp khoản nữa hoặc bấm Xong.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
          aria-busy={pending}
        >
          {pending
            ? "Đang lưu…"
            : initial
              ? "Lưu thay đổi"
              : savedCount > 0
                ? "Ghi khoản này rồi xong"
                : amountUnknown
                  ? "Ghi lại để không quên"
                  : "Ghi khoản này"}
        </Button>
        {/* "Ghi & tiếp tục" chỉ có khi GHI MỚI: sửa một khoản thì không có
            "khoản tiếp theo" nào để mà ở lại. Nút phụ (variant outline) vì lối
            ra mặc định vẫn là ghi xong rồi đóng — người ghi một khoản lẻ không
            phải đọc qua hai nút ngang hàng để đoán cái nào đóng form. */}
        {!initial && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() => save(true)}
          >
            <Plus />
            Ghi & tiếp tục
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

export function EditTransactionDialog({
  groupId,
  categories,
  members,
  currentUserId,
  transaction,
  saveOverride,
  open,
  onOpenChange,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  transaction: EditableTransaction;
  /** Có mặt = đang sửa khoản còn trong hàng chờ; xem `TransactionForm`. */
  saveOverride?: (payload: TransactionFormPayload) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Sửa khoản này</DialogTitle>
          <DialogDescription>
            {saveOverride
              ? "Khoản này còn nằm trong máy, chưa lên sổ. Sửa xong sẽ gửi bản mới khi có mạng."
              : "Đổi số tiền, ngày, loại hoặc cách chia. Bấm “Lưu thay đổi” để ghi lại."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TransactionForm
            groupId={groupId}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            initial={transaction}
            saveOverride={saveOverride}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
