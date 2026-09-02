"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, currentMonth } from "@/lib/utils";

/**
 * Sheet chọn tháng: một năm mỗi lần, mười hai ô tháng.
 *
 * Trước đây tháng chỉ đổi được bằng ‹ › một bước một. Xem lại tháng 3 năm ngoái
 * là mười tám lần bấm, mỗi lần kéo theo một lượt tải trang — người dùng báo
 * đúng chỗ này. Lưới tháng biến quãng đó thành hai cử chỉ: đổi năm rồi chọn
 * tháng.
 *
 * ‹ › ngoài sheet vẫn giữ nguyên: bước một tháng là việc làm nhiều nhất, và nó
 * không đáng phải mở sheet.
 *
 * KHÔNG chặn tháng tương lai. Sổ có thể ghi khoản hẹn trước (tiền nhà, trả nợ),
 * nên "tháng chưa tới" vẫn là tháng có thể có dữ liệu; chỉ làm nhạt đi để phân
 * biệt với quá khứ.
 */
export function MonthPickerDialog({
  open,
  onOpenChange,
  month,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tháng đang xem, dạng "2026-08". */
  month: string;
  onSelect: (month: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Nội dung nằm ở component con để state "đang xem năm nào" sinh ra mới
          mỗi lần mở: sheet mở lại luôn bắt đầu ở năm của tháng đang xem, không
          phải năm lướt dở của lần trước. Radix chỉ mount DialogContent khi mở,
          nên không cần effect nào để dọn. */}
      {open && (
        <MonthPickerBody
          month={month}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      )}
    </Dialog>
  );
}

function MonthPickerBody({
  month,
  onOpenChange,
  onSelect,
}: {
  month: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (month: string) => void;
}) {
  const now = currentMonth();
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));

  const pick = (m: number) => {
    onOpenChange(false);
    onSelect(`${year}-${String(m).padStart(2, "0")}`);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Chọn tháng</DialogTitle>
        <DialogDescription>
          Đổi năm rồi chọn tháng bạn muốn xem.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center justify-between gap-2 rounded-xl bg-sunken p-1">
        <YearButton label="Năm trước" onClick={() => setYear((y) => y - 1)}>
          <ChevronLeft className="size-6" />
        </YearButton>
        <span className="text-title tabular-nums">{year}</span>
        <YearButton label="Năm sau" onClick={() => setYear((y) => y + 1)}>
          <ChevronRight className="size-6" />
        </YearButton>
      </div>

      <div className="-mx-1 grid grid-cols-3 gap-2 px-1">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const key = `${year}-${String(m).padStart(2, "0")}`;
          const selected = key === month;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={selected}
              aria-current={key === now ? "date" : undefined}
              onClick={() => pick(m)}
              className={cn(
                "focus-ring flex min-h-12 items-center justify-center rounded-lg text-label transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-sunken text-foreground hover:bg-border",
                // Tháng chưa tới: nhạt hơn, nhưng vẫn bấm được.
                !selected && key > now && "text-muted-foreground",
                // Tháng này: viền để tìm lại được mốc "hôm nay" sau khi lướt
                // sang năm khác rồi quay về.
                !selected && key === now && "ring-2 ring-inset ring-primary",
              )}
            >
              Tháng {m}
            </button>
          );
        })}
      </div>

      {year !== Number(now.slice(0, 4)) && (
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onSelect(now);
          }}
          className="focus-ring min-h-12 rounded-lg text-label text-primary transition-colors hover:bg-sunken"
        >
          Về tháng này
        </button>
      )}
    </DialogContent>
  );
}

function YearButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="focus-ring flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
    >
      {children}
    </button>
  );
}
