"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelLoanConfirm, markPaidConfirm } from "@/lib/copy";
import { EditLoanDialog, type EditableLoan } from "@/components/loan-dialog";
import { deleteLoan, setLoanStatus } from "@/lib/actions";
import { RowIcon, rowClass } from "@/components/ui/row";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Năm việc làm được với một khoản mượn, dưới dạng HÀNG CÓ NHÃN.
 *
 * Cùng đúng năm mục với menu `⋯` trên thẻ ở danh sách (LoanActions) — menu đó
 * vẫn giữ nguyên cho người dùng thạo tay. Nhưng ở bản cũ, năm việc này CHỈ tồn
 * tại sau một nút ba chấm 24px không nhãn: đánh dấu đã trả xong, bỏ khoản, mở
 * lại, sửa, xoá. Không người lớn tuổi nào tìm ra chúng. Nên chúng được lặp lại
 * ở trang chi tiết thành danh sách hàng chữ rõ ràng, đọc từ trên xuống.
 */
export function LoanActionList({
  groupId,
  loan,
  status,
  paymentCount,
  remaining,
}: {
  groupId: string;
  loan: EditableLoan;
  status: "ACTIVE" | "PAID" | "CANCELLED";
  paymentCount: number;
  /** Số còn lại chưa ghi nhận — bước xác nhận phải nói ra con số này. */
  remaining: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<unknown>, message: string) {
    start(async () => {
      try {
        await fn();
        toast.success(message);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <>
      <section className="space-y-2">
        <h2 className="px-1 text-label text-muted-foreground">Việc khác với khoản này</h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          <Row icon={Pencil} label="Sửa thông tin khoản này" onClick={() => setEditing(true)} disabled={pending} />

          {status === "ACTIVE" ? (
            <>
              <Row
                icon={CheckCircle2}
                label="Đánh dấu đã trả xong"
                hint="Coi như xong hẳn, không nhắc nữa"
                disabled={pending}
                onClick={() => setConfirmingPaid(true)}
              />
              <Row
                icon={XCircle}
                label="Bỏ khoản này (coi như xong)"
                hint="Không đòi nữa, nhưng vẫn giữ lại để xem sau"
                disabled={pending}
                onClick={() => setConfirmingCancel(true)}
              />
            </>
          ) : (
            /* Mở lại CỐ Ý không hỏi lại, khác hai hàng trên. Nó là nghịch đảo
               của chúng và nó THÊM thông tin vào tổng chứ không giấu đi — mà
               muốn hoàn tác thì đúng một cú chạm là xong. */
            <Row
              icon={RotateCcw}
              label="Mở lại — vẫn còn nợ"
              disabled={pending}
              onClick={() => run(() => setLoanStatus(loan.id, "ACTIVE"), "Đã mở lại khoản này")}
            />
          )}

          <Row
            icon={Trash2}
            label="Xoá hẳn khoản này"
            hint="Mất luôn, không lấy lại được"
            tone="destructive"
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
          />
        </div>
      </section>

      <EditLoanDialog groupId={groupId} loan={loan} open={editing} onOpenChange={setEditing} />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Xoá hẳn khoản mượn của ${loan.counterparty}?`}
        description={
          <>
            {formatMoney(loan.amount)}
            {paymentCount > 0
              ? ` và ${paymentCount} lần trả đã ghi sẽ mất luôn, không lấy lại được.`
              : " sẽ mất luôn, không lấy lại được."}{" "}
            Nếu chỉ muốn khép lại khoản này thì dùng “Đánh dấu đã trả xong” hoặc “Bỏ khoản này”.
          </>
        }
        confirmLabel="Xoá hẳn"
        successMessage="Đã xoá khoản mượn"
        onConfirm={() => deleteLoan(loan.id)}
        onDone={() => router.push("/loans?view=loans")}
      />

      <ConfirmDialog
        open={confirmingPaid}
        onOpenChange={setConfirmingPaid}
        title={`Đánh dấu khoản của ${loan.counterparty} là đã trả xong?`}
        description={markPaidConfirm(loan.type, remaining)}
        confirmLabel="Đánh dấu đã trả xong"
        // Việc TÍCH CỰC — nút đỏ ở đây sẽ dạy người dùng rằng khoản nợ của họ
        // sắp bị xoá. Cả ba nhãn mặc định của ConfirmDialog đều phải đổi.
        confirmVariant="default"
        pendingLabel="Đang lưu…"
        cancelLabel="Thôi, để nguyên"
        successMessage="Đã đánh dấu trả xong"
        onConfirm={() => setLoanStatus(loan.id, "PAID")}
      />

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title={`Bỏ khoản mượn của ${loan.counterparty}?`}
        description={cancelLoanConfirm(remaining)}
        confirmLabel="Bỏ khoản này"
        pendingLabel="Đang lưu…"
        successMessage="Đã bỏ khoản này"
        onConfirm={() => setLoanStatus(loan.id, "CANCELLED")}
      />
    </>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  tone = "normal",
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  tone?: "normal" | "destructive";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={rowClass()}
    >
      <RowIcon icon={Icon} tone={tone === "destructive" ? "expense" : "primary"} />
      <span className="min-w-0 flex-1">
        <span
          className={cn("block truncate text-body-lg", tone === "destructive" && "text-destructive")}
        >
          {label}
        </span>
        {hint && <span className="block truncate text-caption text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
