"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signedMoney } from "@/lib/copy";
import { createTransaction } from "@/lib/actions";
import {
  flushPending,
  listPending,
  onPendingChanged,
  removePending,
  type PendingTx,
} from "@/lib/offline-queue";
import { cn, formatDate } from "@/lib/utils";

/**
 * Những khoản đã ghi nhưng chưa gửi được lên, kèm việc tự gửi lại.
 *
 * Vì sao phải HIỆN RA chứ không âm thầm gửi sau: khoản đang chờ không có trong
 * CSDL, nên danh sách do server vẽ không thấy nó. Nếu không có khối này thì người
 * dùng ghi lúc mất mạng, bấm Lưu, rồi nhìn xuống thấy sổ trống trơn — đúng cái
 * cảm giác "sổ không còn đúng" mà cả tính năng này ra để dẹp. Thấy nó nằm đó với
 * chữ "chờ gửi" thì mới tin được là chưa mất.
 *
 * Đặt Ở TRÊN danh sách, không phải dưới: nó là thứ mới nhất và là thứ duy nhất
 * cần người dùng để ý tới.
 */
export function PendingTransactions({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<PendingTx[]>([]);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const refresh = useCallback(() => {
    listPending(groupId).then(setItems);
  }, [groupId]);

  const flush = useCallback(async () => {
    setSending(true);
    try {
      const sent = await flushPending((payload) => createTransaction(payload));
      // Chỉ refresh khi CÓ gửi được: `router.refresh()` là một lượt hỏi server
      // đầy đủ, gọi vô cớ mỗi lần app mở là tự làm chậm mình.
      if (sent > 0) {
        toast.success(sent === 1 ? "Đã gửi khoản chờ lên sổ" : `Đã gửi ${sent} khoản chờ lên sổ`);
        router.refresh();
      }
    } finally {
      setSending(false);
      refresh();
    }
  }, [refresh, router]);

  useEffect(() => {
    refresh();
    const off = onPendingChanged(refresh);
    return off;
  }, [refresh]);

  useEffect(() => {
    // Hai lối gửi lại, cố ý KHÔNG dùng Background Sync của service worker: iOS
    // không có nó, mà iOS là nửa số máy của app này.
    //  · mở app / quay lại tab — bắt được cả trường hợp mạng đã có lại từ lúc
    //    app đóng, khi không hề có sự kiện `online` nào bắn ra;
    //  · sự kiện `online` — bắt được lúc đang mở app mà sóng vừa về.
    const wake = () => {
      if (document.visibilityState === "visible") void flush();
    };
    wake();
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [flush]);

  if (items.length === 0) return null;

  const stuck = items.filter((i) => i.lastError).length;

  return (
    <section
      aria-label="Khoản chờ gửi"
      className="overflow-hidden rounded-xl border border-warning bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border bg-warning-surface px-4 py-2.5">
        <CloudOff aria-hidden className="size-5 shrink-0 text-warning" />
        <p className="min-w-0 flex-1 text-label text-warning">
          {stuck > 0
            ? `${items.length} khoản chưa lên sổ`
            : `${items.length} khoản đang chờ gửi`}
        </p>
        {stuck < items.length && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={sending}
            aria-busy={sending}
            onClick={() => void flush()}
          >
            {sending ? "Đang gửi…" : "Gửi lại"}
          </Button>
        )}
      </div>

      <ul className="divide-y divide-border">
        {items.map((i) => {
          const inbound = i.payload.type === "INCOME";
          return (
            <li key={i.clientId} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sunken text-title">
                {i.icon ?? (inbound ? "💵" : "📦")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-body-lg">{i.label}</div>
                <div className="text-caption text-muted-foreground">
                  {i.lastError ? (
                    <span className="flex items-start gap-1.5 text-warning">
                      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0">Sổ không nhận: {i.lastError}</span>
                    </span>
                  ) : (
                    <>Chờ gửi · {formatDate(i.payload.date)}</>
                  )}
                </div>
              </div>
              <span
                className={cn("num shrink-0 text-money-row", inbound ? "text-income" : "text-expense")}
              >
                {signedMoney(i.payload.amount, inbound ? "in" : "out")}
              </span>
              {/* Chỉ khoản bị server TỪ CHỐI mới có nút bỏ. Khoản đang chờ mạng
                  thì không — đưa nút xoá cho nó là mời người dùng tự tay làm mất
                  đúng thứ tính năng này đang giữ hộ. */}
              {i.lastError && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Bỏ khoản ${i.label} khỏi hàng chờ`}
                  onClick={() => void removePending(i.clientId)}
                >
                  <X />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
