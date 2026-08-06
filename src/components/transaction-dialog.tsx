"use client";
import { useState, useTransition } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmountField } from "@/components/money-input";
import { DateField } from "@/components/date-field";
import { Segmented } from "@/components/segmented";
import {
  SplitEditor,
  defaultSplitState,
  splitStateFrom,
  splitStateToPayload,
  type SplitState,
} from "@/components/split-editor";
import { type MemberOption } from "@/lib/member";
import { IconPicker } from "@/components/icon-picker";
import { createCategory, createTransaction, updateTransaction } from "@/lib/actions";
import { cn, dateKey } from "@/lib/utils";

export type CategoryOption = {
  id: string;
  name: string;
  icon: string | null;
  type: "INCOME" | "EXPENSE";
};

type TxType = "INCOME" | "EXPENSE";

export type EditableTransaction = {
  id: string;
  type: TxType;
  amount: number;
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
    if (!trimmed) return;
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
    <div className="space-y-2">
      <Label>Khoản này là gì?</Label>
      {/* Thứ tự bấm QUAN TRỌNG: loại bấm đầu tiên là loại chính, và nó là cái
          hiện ra ở danh sách. Bản cũ chỉ đánh số mà không nói vì sao. */}
      <p className="text-caption text-muted-foreground">
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
  onDone,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  initial?: EditableTransaction;
  /** Đã chọn "Tôi tiêu tiền"/"Tôi nhận tiền" ở màn trước → bỏ luôn nút gạt ở đây. */
  defaultType?: TxType;
  onDone: () => void;
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? defaultType ?? "EXPENSE");
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [date, setDate] = useState(initial ? dateKey(initial.date) : dateKey(new Date()));
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

  const visible = [...categories, ...added].filter((c) => c.type === type);
  // Sổ một người thì không có gì để chia — để server tự mặc định chia đều.
  const shared = members.length > 1;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Nhập số tiền lớn hơn 0");
      return;
    }
    if (!date) {
      toast.error("Chọn ngày");
      return;
    }
    // Server coi splits rỗng là "chia đều cho cả sổ", nên phải chặn ở đây kẻo
    // người dùng để trống hết ở chế độ "Số tiền" lại thành chia đều mà không hay.
    const splits = shared ? splitStateToPayload(split) : [];
    if (shared && splits.length === 0) {
      toast.error("Chọn ít nhất một người để chia");
      return;
    }
    start(async () => {
      try {
        const payload = {
          type,
          amount,
          date,
          categoryIds,
          note: note.trim() || null,
          ...(shared ? { paidById: split.paidById, splits } : {}),
        };
        if (initial) await updateTransaction(initial.id, payload);
        else await createTransaction({ groupId, ...payload });
        toast.success(initial ? "Đã cập nhật khoản" : "Đã ghi khoản");
        onDone();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    // Form chiếm hết chiều cao sheet: phần nhập cuộn, nút lưu luôn thấy được.
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-5">
      <DialogBody className="space-y-5">
        {/* Đổi chiều thì bỏ loại đang chọn, vì loại gắn với chi hay thu.
            Chỉ hiện khi SỬA: lúc ghi mới, chiều đã chọn ở màn trước rồi. */}
        {initial && (
          <Segmented
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

        <AmountField value={amount} onValueChange={setAmount} type={type} autoFocus />

        <CategoryPicker
          groupId={groupId}
          type={type}
          categories={visible}
          value={categoryIds}
          onChange={setCategoryIds}
          onCreated={(c) => {
            setAdded((prev) => [...prev, c]);
            setCategoryIds((prev) => [...prev, c.id]);
          }}
        />

        {shared && (
          <SplitEditor
            members={members}
            type={type}
            amount={amount}
            value={split}
            onChange={setSplit}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
          <DateField id="date" label="Ngày" value={date} onChange={setDate} required />
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú (không bắt buộc)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: cà phê với khách"
            />
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Ghi khoản này"}
        </Button>
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
  open,
  onOpenChange,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  transaction: EditableTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Sửa khoản này</DialogTitle>
        </DialogHeader>
        {open && (
          <TransactionForm
            groupId={groupId}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            initial={transaction}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
