"use client";
import { useState, useSyncExternalStore } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/utils";

/**
 * Ba mức cỡ chữ: 16 → 18 → 20px (hệ số nhân vào cỡ gốc, xem `html { font-size }`
 * và .fs-md / .fs-lg trong globals.css). Spacing tính bằng rem nên padding và
 * chiều cao nút lớn theo chữ, hàng không tràn.
 *
 * Cần nút này vì PWA đã cài trên iPhone KHÔNG nhận cỡ chữ hệ thống, và zoom hai
 * ngón ở chế độ standalone không giãn lại bố cục.
 *
 * Mỗi ô vẽ "Aa" ở đúng cỡ của nó (px, không rem — rem sẽ phóng cả ba theo mức
 * đang chọn và xem trước nói dối). Bên dưới là một hàng giao dịch mẫu tính bằng
 * rem, tức đổi ngay khi bấm: xem trước thật, không phải mô tả.
 */

const OPTIONS = [
  { value: "sm", label: "Nhỏ", scale: 1 },
  { value: "md", label: "Vừa", scale: 1.125 },
  { value: "lg", label: "Lớn", scale: 1.25 },
] as const;

type Value = (typeof OPTIONS)[number]["value"];

function apply(value: Value) {
  const root = document.documentElement;
  root.classList.remove("fs-md", "fs-lg");
  if (value !== "sm") root.classList.add(`fs-${value}`);
  try {
    localStorage.setItem("fs", value);
  } catch {
    // Chặn storage thì chỉ mất phần nhớ lựa chọn.
  }
}

function currentFromDom(): Value {
  const c = document.documentElement.classList;
  return c.contains("fs-lg") ? "lg" : c.contains("fs-md") ? "md" : "sm";
}

export function FontSizeControl() {
  // Server không biết class trên <html>: trả cùng giá trị ở hai phía rồi mới
  // đọc DOM sau hydrate. Script trong <head> đã áp class nên chữ không nháy.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [picked, setPicked] = useState<Value | null>(null);
  const value = picked ?? (mounted ? currentFromDom() : null);

  return (
    <div className="space-y-3">
      <ChoiceGroup
        label="Cỡ chữ"
        variant="card"
        className="grid-cols-3 sm:grid-cols-3"
        value={value ?? ""}
        onChange={(next) => {
          apply(next);
          setPicked(next);
        }}
        options={OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        renderOption={(o, { active }) => {
          const scale = OPTIONS.find((x) => x.value === o.value)!.scale;
          return (
            <span className="flex flex-col items-center gap-1 text-center">
              <span
                aria-hidden
                className={cn("font-semibold leading-none", active ? "text-primary" : "text-foreground")}
                style={{ fontSize: `${Math.round(scale * 20)}px` }}
              >
                Aa
              </span>
              <span className={cn("text-caption", active ? "text-primary" : "text-muted-foreground")}>
                {o.label}
              </span>
            </span>
          );
        }}
      />

      {/* Xem trước sống: tính bằng rem nên đổi ngay theo mức vừa chọn. */}
      <div aria-hidden className="rounded-lg border border-border bg-background p-3">
        <p className="text-caption text-muted-foreground">Xem trước</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-title leading-none">
            🍜
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-lg">Ăn sáng</span>
            <span className="block truncate text-caption text-muted-foreground">Hôm nay · Ăn uống</span>
          </span>
          <Amount value={-45000} size="row" />
        </div>
      </div>
    </div>
  );
}
