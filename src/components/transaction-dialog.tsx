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
  /** Theo đúng thứ tự đã chọn — phần tử đầu là danh mục chính. */
  categoryIds: string[];
  note: string | null;
  paidById: string | null;
  splits: { userId: string; weight: number; amount: number | null }[];
};

/**
 * Lưới chọn danh mục: chọn được nhiều danh mục cho một giao dịch, và tạo nhanh
 * danh mục mới ngay tại đây (danh mục vừa tạo được chọn luôn).
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
        toast.success("Đã thêm danh mục");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Danh mục</Label>
        <span className="text-[11px] text-muted-foreground">
          {value.length > 1 ? `Đã chọn ${value.length}` : "Chọn được nhiều"}
        </span>
      </div>

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
                "relative flex min-w-0 flex-col items-center gap-1 rounded-md border px-1 py-2 text-center text-[11px] font-medium leading-tight transition-all",
                on
                  ? "border-primary bg-primary/10 text-primary shadow-soft"
                  : "border-transparent bg-sunken text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Nhiều danh mục thì đánh số để thấy rõ đâu là danh mục chính */}
              {on && value.length > 1 && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {order + 1}
                </span>
              )}
              <span className="text-xl leading-none">{c.icon ?? "📁"}</span>
              <span className="line-clamp-2 break-words">{c.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex min-w-0 flex-col items-center gap-1 rounded-md border border-dashed border-border px-1 py-2 text-center text-[11px] font-medium leading-tight text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-5" />
          <span>Tạo mới</span>
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-lg bg-sunken p-3">
          <div className="flex gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-lg shadow-soft">
              {icon}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "INCOME" ? "Tên danh mục thu" : "Tên danh mục chi"}
              autoFocus
              className="bg-card"
              // Enter ở đây là "lưu danh mục", không phải gửi cả giao dịch.
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
              aria-label="Lưu danh mục"
            >
              <Check className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setAdding(false)}
              aria-label="Huỷ"
            >
              <X className="size-4" />
            </Button>
          </div>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      )}

      {categories.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          Chưa có danh mục nào — bấm “Tạo mới” để thêm.
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
  onDone,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  initial?: EditableTransaction;
  onDone: () => void;
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [date, setDate] = useState(initial ? dateKey(initial.date) : dateKey(new Date()));
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  // Danh mục vừa tạo ngay trong form — props `categories` chỉ mới lại sau khi
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
        toast.success(initial ? "Đã cập nhật giao dịch" : "Đã ghi giao dịch");
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
        {/* Đổi loại thì bỏ danh mục đang chọn, vì danh mục gắn với loại thu/chi */}
        <Segmented
          value={type}
          onChange={(v) => {
            setType(v as TxType);
            setCategoryIds([]);
          }}
          options={[
            { value: "EXPENSE", label: "Chi", tone: "expense" },
            { value: "INCOME", label: "Thu", tone: "income" },
          ]}
        />

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

        <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
          <DateField id="date" label="Ngày" value={date} onChange={setDate} required />
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: cà phê với khách hàng"
            />
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={pending}>
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Ghi giao dịch"}
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
          <DialogTitle>Sửa giao dịch</DialogTitle>
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
