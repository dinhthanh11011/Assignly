"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MoreVertical, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditLoanDialog, type EditableLoan } from "@/components/loan-dialog";
import { deleteLoan, deleteLoanPayment, setLoanStatus } from "@/lib/actions";

export function LoanActions({
  groupId,
  loan,
  status,
}: {
  groupId: string;
  loan: EditableLoan;
  status: "ACTIVE" | "PAID" | "CANCELLED";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<unknown>, message: string, back = false) {
    start(async () => {
      try {
        await fn();
        toast.success(message);
        if (back) router.push("/loans");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={pending} aria-label="Tuỳ chọn">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Sửa thông tin
          </DropdownMenuItem>
          {status === "ACTIVE" ? (
            <>
              <DropdownMenuItem
                onClick={() => run(() => setLoanStatus(loan.id, "PAID"), "Đã đánh dấu tất toán")}
              >
                <CheckCircle2 className="size-4" /> Đánh dấu tất toán
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => run(() => setLoanStatus(loan.id, "CANCELLED"), "Đã huỷ khoản vay")}
              >
                <XCircle className="size-4" /> Huỷ / xoá nợ
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              onClick={() => run(() => setLoanStatus(loan.id, "ACTIVE"), "Đã mở lại khoản vay")}
            >
              <RotateCcw className="size-4" /> Mở lại khoản vay
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => run(() => deleteLoan(loan.id), "Đã xoá khoản vay", true)}
          >
            <Trash2 className="size-4" /> Xoá khoản vay
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditLoanDialog groupId={groupId} loan={loan} open={editing} onOpenChange={setEditing} />
    </>
  );
}

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      aria-label="Xoá khoản thanh toán"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await deleteLoanPayment(paymentId);
            toast.success("Đã xoá");
          } catch (e) {
            toast.error((e as Error).message);
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
