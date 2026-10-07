"use client";
import * as React from "react";
import { ChevronDown, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  billPersonName,
  formatBillShare,
  type BillInput,
  type BillResult,
  type PersonResult,
} from "@/lib/bill-split";
import { cn, formatMoney } from "@/lib/utils";

const canShareStore = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/** Kết quả: tổng hoá đơn, mỗi người phải trả bao nhiêu, và nút gửi vào nhóm chat. */
export function BillResultCard({ input, result }: { input: BillInput; result: BillResult }) {
  // navigator.share chỉ biết ở client — render đầu luôn "không có" cho khớp server.
  const canShare = React.useSyncExternalStore(() => () => {}, canShareStore, () => false);
  const empty = result.subtotal === 0;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép — dán vào nhóm chat nhé");
    } catch {
      toast.error("Không sao chép được trên máy này");
    }
  }

  async function share() {
    const text = formatBillShare(input, result);
    if (!canShare) return copy(text);
    try {
      await navigator.share({ title: "Chia hoá đơn", text });
    } catch (e) {
      // Người dùng đóng bảng chia sẻ thì thôi, không phải lỗi.
      if ((e as Error).name !== "AbortError") copy(text);
    }
  }

  return (
    <section aria-labelledby="bill-result" className="space-y-3">
      <h2 id="bill-result" className="text-title">
        Mỗi người trả
      </h2>
      <Card className="overflow-hidden">
        <dl className="space-y-1.5 border-b border-border bg-sunken px-4 py-3 text-body">
          <SummaryRow label="Tiền món" value={formatMoney(result.subtotal)} />
          {result.discount > 0 && (
            <SummaryRow label="Giảm giá" value={`−${formatMoney(result.discount)}`} className="text-income" />
          )}
          {result.service > 0 && <SummaryRow label="Phí dịch vụ" value={`+${formatMoney(result.service)}`} />}
          {result.vat > 0 && <SummaryRow label="VAT" value={`+${formatMoney(result.vat)}`} />}
          <SummaryRow label="Tổng hoá đơn" value={formatMoney(result.total)} className="text-body-lg font-bold" />
        </dl>

        {empty ? (
          <p className="px-4 py-6 text-center text-body text-muted-foreground">
            Nhập giá món ở trên để xem mỗi người trả bao nhiêu.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {result.people.map((r) => (
              <PersonRow
                key={r.id}
                name={billPersonName(input.people, r.id)}
                r={r}
                isPayer={input.people.length > 1 && r.id === result.payerId}
              />
            ))}
          </ul>
        )}
      </Card>

      {!empty && (
        <div className="flex flex-wrap gap-2">
          <Button className="flex-[1_1_10rem]" onClick={share}>
            {canShare ? <Share2 /> : <Copy />} {canShare ? "Gửi vào nhóm chat" : "Sao chép kết quả"}
          </Button>
          {canShare && (
            <Button variant="outline" className="flex-[1_1_10rem]" onClick={() => copy(formatBillShare(input, result))}>
              <Copy /> Sao chép
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function PersonRow({ name, r, isPayer }: { name: string; r: PersonResult; isPayer: boolean }) {
  return (
    <li>
      <details className="group">
        <summary className="focus-ring-inset flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 hover:bg-sunken [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-lg font-semibold">{name}</span>
            <span className="block text-caption text-muted-foreground">
              {isPayer ? (
                "Người trả hoá đơn"
              ) : (
                <span className="whitespace-nowrap">Món {formatMoney(r.own + r.shared)}</span>
              )}
              {r.discount > 0 && (
                <span className="whitespace-nowrap text-income"> · giảm {formatMoney(r.discount)}</span>
              )}
            </span>
          </span>
          <span className="num text-body-lg font-bold">{formatMoney(r.pay)}</span>
          <ChevronDown
            className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <dl className="space-y-1 px-4 pb-3 text-body text-muted-foreground">
          <SummaryRow label="Món riêng" value={formatMoney(r.own)} />
          {r.shared > 0 && <SummaryRow label="Món chung, ship" value={`+${formatMoney(r.shared)}`} />}
          {r.discount > 0 && (
            <SummaryRow label="Được giảm" value={`−${formatMoney(r.discount)}`} className="text-income" />
          )}
          {r.service > 0 && <SummaryRow label="Phí dịch vụ" value={`+${formatMoney(r.service)}`} />}
          {r.vat > 0 && <SummaryRow label="VAT" value={`+${formatMoney(r.vat)}`} />}
          {r.roundingDelta !== 0 && (
            <SummaryRow
              label={isPayer ? "Gánh phần làm tròn" : "Làm tròn"}
              value={`${r.roundingDelta > 0 ? "+" : "−"}${formatMoney(Math.abs(r.roundingDelta))}`}
            />
          )}
          <SummaryRow label="Phải trả" value={formatMoney(r.pay)} className="font-semibold text-foreground" />
        </dl>
      </details>
    </li>
  );
}
