"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { call } from "@/lib/action-result";
import { createTransaction, deleteTransaction, updateTransaction } from "@/lib/actions";
import { enqueuePending, isOfflineError, newClientId } from "@/lib/offline-queue";
import { openQuickAdd, type TransactionTemplate } from "@/lib/quick-add";
import { type MemberOption } from "@/lib/member";
import { dateKey, formatMoney, todayKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { AmountField } from "@/components/money-input";
import { FieldError, useValidation } from "@/components/field";
import {
  defaultSplitState,
  splitStateFrom,
  splitStateToPayload,
  type SplitState,
} from "@/components/split-editor";
import { CategoryPicker } from "./category-picker";
import { DateChips } from "./date-chips";
import { SplitSection } from "./split-section";
import type {
  CategoryOption,
  EditableTransaction,
  TransactionFormPayload,
  TxType,
} from "./types";

/**
 * Form ghi / sửa một khoản thu chi — MỘT bước.
 *
 * Thứ tự theo đúng nhịp ghi: số tiền (focus sẵn, bàn phím số) → loại (lưới loại
 * hay dùng) → ngày (chip) → ghi chú → "Chia với…" (gấp sẵn). Khoản chi thường
 * ngày là 4 chạm: Ghi → gõ số → chọn loại → Lưu.
 *
 * Lỗi chấm lúc rời ô (blur) và lúc bấm Lưu; Lưu thì focus ô sai đầu tiên.
 */
export function TransactionForm({
  groupId,
  categories,
  members,
  currentUserId,
  initial,
  template,
  defaultType,
  defaultDate,
  saveOverride,
  onSwitchToLoan,
  onDone,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  initial?: EditableTransaction;
  /**
   * Ghi MỚI nhưng điền sẵn từ một khoản cũ ("Ghi lại khoản này"). Khác
   * `initial`: lưu ra là tạo khoản mới, ngày là `defaultDate` hoặc hôm nay.
   */
  template?: TransactionTemplate;
  defaultType?: TxType;
  /** Ngày đặt sẵn khi ghi mới, "2026-08-05" — VD mở từ một ô lịch. */
  defaultDate?: string;
  /**
   * Lưu đi chỗ KHÁC server: khoản còn trong hàng chờ ngoại tuyến được sửa thẳng
   * trong IndexedDB (nó chưa có id trên server để `updateTransaction`).
   */
  saveOverride?: (payload: TransactionFormPayload) => Promise<void>;
  /** Có mặt = hiện chip "Cho mượn / Đi mượn" để chuyển sang form khoản mượn. */
  onSwitchToLoan?: () => void;
  onDone: () => void;
}) {
  // Loại đã bị xoá từ lúc khoản gốc được ghi thì bỏ ra — server từ chối id lạ.
  const seed = initial ?? template;
  const [type, setType] = useState<TxType>(seed?.type ?? defaultType ?? "EXPENSE");
  const [amount, setAmount] = useState(seed?.amount ?? 0);
  const [amountUnknown, setAmountUnknown] = useState(initial?.amountUnknown ?? false);
  const [date, setDate] = useState(initial ? dateKey(initial.date) : defaultDate || todayKey());
  const [categoryIds, setCategoryIds] = useState<string[]>(() =>
    initial
      ? initial.categoryIds
      : (template?.categoryIds.filter((id) => categories.some((c) => c.id === id)) ?? [])
  );
  // Loại vừa tạo trong form — props `categories` chỉ mới lại sau khi trang vẽ lại.
  const [added, setAdded] = useState<CategoryOption[]>([]);
  const [note, setNote] = useState(seed?.note ?? "");
  const [split, setSplit] = useState<SplitState>(() =>
    seed
      ? splitStateFrom(
          members,
          // Người trả của khoản gốc có thể đã rời sổ — khi đó về người đang ghi.
          seed.paidById && members.some((m) => m.id === seed.paidById) ? seed.paidById : currentUserId,
          seed.splits,
          seed.splitMode
        )
      : defaultSplitState(members, currentUserId)
  );
  const [pending, start] = useTransition();
  const amountTouched = useRef(false);
  const { errors, check, clear, validate } = useValidation<"tx-amount" | "date" | "tx-split">();

  // Gộp loại vừa tạo theo id, bản từ props thắng (mới hơn) — tránh hai ô trùng.
  const visible = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    for (const c of added) if (!byId.has(c.id)) byId.set(c.id, c);
    return [...byId.values()].filter((c) => c.type === type);
  }, [categories, added, type]);
  // Sổ một người thì không có gì để chia — server tự mặc định chia đều.
  const shared = members.length > 1;
  const amountMessage = "Nhập số tiền lớn hơn 0";

  function save() {
    // Server coi splits rỗng là "chia đều cả sổ" — chặn ở đây kẻo chế độ "tự
    // nhập" để trống hết lại thành chia đều mà người dùng không hay.
    const splits = shared ? splitStateToPayload(split) : [];
    if (
      !check([
        // Chọn "chưa biết số tiền" thì không có luật nào để sai.
        { field: "tx-amount", invalid: !amountUnknown && amount <= 0, message: amountMessage },
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
        // Gửi 0 khi chưa biết tiền, để bản trong hàng chờ ngoại tuyến (vẽ thẳng
        // từ payload) không hiện con số người dùng chưa từng xác nhận.
        amount: amountUnknown ? 0 : amount,
        amountUnknown,
        date,
        categoryIds,
        note: note.trim() || null,
        ...(shared ? { paidById: split.paidById, splits, splitMode: split.mode } : {}),
      };
      // "Ghi tiếp": mở lại form trống, GIỮ ngày và chiều — ghi bù ba khoản của
      // tối qua không phải chỉnh lại ngày ba lần.
      const again = {
        label: "Ghi tiếp",
        onClick: () => openQuickAdd({ date, type }),
      };
      const what = amountUnknown
        ? type === "INCOME" ? "khoản thu" : "khoản chi"
        : `${type === "INCOME" ? "khoản thu" : "khoản chi"} ${formatMoney(amount)}`;
      try {
        if (saveOverride) {
          await saveOverride(payload);
          toast.success("Đã sửa khoản này");
          onDone();
          return;
        }
        if (initial) {
          await call(updateTransaction(initial.id, payload, initial.version));
          toast.success("Đã lưu thay đổi");
        } else {
          const created = await call(createTransaction({ groupId, ...payload }));
          // Hoàn tác ngay trên toast: ghi nhầm thì sửa trong một chạm.
          toast.success(`Đã ghi ${what}`, {
            duration: 8000,
            action: {
              label: "Hoàn tác",
              onClick: () => {
                void call(deleteTransaction(created.id, created.version))
                  .then(() => toast.success("Đã bỏ khoản vừa ghi"))
                  .catch((e: Error) => toast.error(e.message));
              },
            },
            cancel: again,
          });
        }
        onDone();
      } catch (err) {
        // MẤT MẠNG THÌ KHÔNG ĐƯỢC LÀM MẤT KHOẢN — giữ trong máy, tự gửi sau (xem
        // `src/lib/offline-queue.ts`). Chỉ cho khoản GHI MỚI: sửa mù lúc mất mạng
        // là cách âm thầm ghi đè thay đổi của người khác trong sổ chung.
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
            toast.success("Đã lưu trong máy, sẽ tự gửi khi có mạng", { cancel: again });
            onDone();
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

  const submitLabel = initial
    ? "Lưu thay đổi"
    : amountUnknown
      ? "Ghi lại để không quên"
      : type === "INCOME"
        ? "Lưu khoản thu"
        : "Lưu khoản chi";

  return (
    // noValidate: bong bóng validation gốc của trình duyệt chạy TRƯỚC onSubmit
    // (tiếng Anh) và chặn mọi lỗi inline bên dưới.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <DialogBody className="space-y-5 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Đổi chiều thì bỏ loại đang chọn: loại gắn với chi hoặc thu. */}
          <ChoiceGroup
            label="Khoản chi hay khoản thu"
            value={type}
            onChange={(v) => {
              setType(v);
              setCategoryIds([]);
            }}
            options={[
              { value: "EXPENSE", label: "Chi", icon: ArrowUpRight, tone: "expense" },
              { value: "INCOME", label: "Thu", icon: ArrowDownLeft, tone: "income" },
            ]}
            className="flex-[1_1_10rem]"
          />
          {onSwitchToLoan && (
            <Button type="button" variant="ghost" size="sm" onClick={onSwitchToLoan} className="ml-auto text-muted-foreground">
              <HandCoins aria-hidden />
              Cho mượn / Đi mượn
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <AmountField
            id="tx-amount"
            value={amount}
            onValueChange={(v) => {
              amountTouched.current = true;
              setAmount(v);
              clear("tx-amount");
            }}
            onBlur={() => {
              if (amountTouched.current) validate("tx-amount", !amountUnknown && amount <= 0, amountMessage);
            }}
            type={type}
            autoFocus
            invalid={Boolean(errors["tx-amount"])}
            describedBy={errors["tx-amount"] && "tx-amount-error"}
            amountUnknown={amountUnknown}
            onAmountUnknownChange={(next) => {
              setAmountUnknown(next);
              clear("tx-amount");
              // Chia theo SỐ TIỀN cụ thể mất nghĩa khi chưa có tổng (server cũng
              // từ chối) — đưa về chia đều ngay lúc bấm.
              if (next) setSplit((prev) => (prev.mode === "EXACT" ? { ...prev, mode: "EQUAL" } : prev));
            }}
          />
          <FieldError id="tx-amount-error">{errors["tx-amount"]}</FieldError>
        </div>

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

        <DateChips
          id="date"
          value={date}
          onChange={(v) => {
            setDate(v);
            if (v) clear("date");
            else validate("date", true, "Chọn ngày");
          }}
          invalid={Boolean(errors.date)}
          error={<FieldError id="date-error">{errors.date}</FieldError>}
        />

        <div className="space-y-2">
          <Label htmlFor="note">
            Ghi chú <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          </Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: cà phê với khách"
            enterKeyHint="done"
            autoComplete="off"
          />
        </div>

        {shared && (
          <SplitSection
            id="tx-split"
            members={members}
            currentUserId={currentUserId}
            type={type}
            amount={amount}
            amountUnknown={amountUnknown}
            value={split}
            onChange={(v) => {
              setSplit(v);
              clear("tx-split");
            }}
            error={errors["tx-split"]}
          />
        )}
      </DialogBody>

      <DialogFooter>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? "Đang lưu…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
