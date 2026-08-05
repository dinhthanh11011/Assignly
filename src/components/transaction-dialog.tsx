"use client";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { AmountField } from "@/components/money-input";
import { Segmented } from "@/components/segmented";
import { createTransaction, updateTransaction } from "@/lib/actions";
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
  categoryId: string | null;
  note: string | null;
};

function TransactionForm({
  groupId,
  categories,
  initial,
  onDone,
}: {
  groupId: string;
  categories: CategoryOption[];
  initial?: EditableTransaction;
  onDone: () => void;
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [date, setDate] = useState(initial ? dateKey(initial.date) : dateKey(new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, start] = useTransition();

  const visible = categories.filter((c) => c.type === type);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Nhập số tiền lớn hơn 0");
      return;
    }
    start(async () => {
      try {
        const payload = { type, amount, date, categoryId, note: note.trim() || null };
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
            setCategoryId(null);
          }}
          options={[
            { value: "EXPENSE", label: "Chi", tone: "expense" },
            { value: "INCOME", label: "Thu", tone: "income" },
          ]}
        />

        <AmountField value={amount} onValueChange={setAmount} type={type} autoFocus />

        <div className="space-y-2">
          <Label>Danh mục</Label>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có danh mục nào. Thêm ở trang Danh mục.
            </p>
          ) : (
            // Mobile: không cuộn lồng nhau — để cả sheet cuộn, đỡ kẹt ngón tay.
            <div className="-mx-1 grid grid-cols-4 gap-1.5 px-1 pb-1 sm:max-h-48 sm:grid-cols-5 sm:overflow-y-auto">
              {visible.map((c) => {
                const on = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(on ? null : c.id)}
                    className={cn(
                      "flex min-w-0 flex-col items-center gap-1 rounded-md border px-1 py-2 text-center text-[11px] font-medium leading-tight transition-all",
                      on
                        ? "border-primary bg-primary/10 text-primary shadow-soft"
                        : "border-transparent bg-sunken text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="text-xl leading-none">{c.icon ?? "📁"}</span>
                    <span className="line-clamp-2 break-words">{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
          <div className="space-y-2">
            <Label htmlFor="date">Ngày</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
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

/**
 * Nút ghi giao dịch. Trên điện thoại nó tách khỏi luồng, thành nút "+" nổi đúng ô
 * trống giữa thanh điều hướng dưới; từ md trở lên là nút thường trong header.
 */
export function AddTransactionButton({
  groupId,
  categories,
  className,
}: {
  groupId: string;
  categories: CategoryOption[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="gradient"
          aria-label="Ghi giao dịch"
          className={cn(
            // Mobile: đĩa lime nổi đúng ô trống giữa thanh nav kính, nhô lên 6px.
            "fixed bottom-[calc(env(safe-area-inset-bottom)+1.1rem)] left-1/2 z-40 size-14 -translate-x-1/2 p-0 md:static md:size-auto md:h-10 md:w-auto md:translate-x-0 md:px-4",
            className
          )}
        >
          <Plus className="size-6 md:size-4" />
          <span className="hidden md:inline">Ghi giao dịch</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>Giao dịch mới</DialogTitle>
        </DialogHeader>
        {/* Chỉ mount khi mở → form luôn ở trạng thái sạch mỗi lần mở lại */}
        {open && (
          <TransactionForm groupId={groupId} categories={categories} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditTransactionDialog({
  groupId,
  categories,
  transaction,
  open,
  onOpenChange,
}: {
  groupId: string;
  categories: CategoryOption[];
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
            initial={transaction}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
