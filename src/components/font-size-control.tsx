"use client";
import { useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ba mức cỡ chữ.
 *
 * Vì sao cần nút này chứ không dựa vào hệ điều hành: khi app đã được cài vào
 * màn hình chính (PWA) trên iPhone, cỡ chữ hệ thống KHÔNG áp vào được, và zoom
 * hai ngón trong chế độ standalone thì không giãn lại bố cục. Với người dùng
 * mà app này nhắm tới, đây là cái cần gạt duy nhất họ thật sự với tới được.
 *
 * Hệ số nhân vào cỡ chữ GỐC (xem `html { font-size }` trong globals.css), và
 * spacing của Tailwind tính bằng rem — nên padding, khoảng cách và chiều cao
 * nút lớn lên cùng chữ, hàng không bị tràn.
 *
 * Mỗi lựa chọn render câu mẫu Ở ĐÚNG CỠ CỦA NÓ: xem trước, không phải mô tả.
 * Bảo ai đó chọn "1.2×" là vô nghĩa; cho họ nhìn thấy thì chọn được ngay.
 *
 * THANG: 15 → 18 → 20px. Mức NHỎ là mặc định nên nó không mang class nào
 * (`value: "sm"` chỉ là tên trong storage). Bước đầu rộng hơn bước sau là cố ý —
 * xem ghi chú ở thang cỡ chữ trong globals.css.
 *
 * Bản trước có bốn mức tới 21,8px. Hạ trần về 20px là ĐÁNH ĐỔI CÓ THẬT, không
 * phải dọn dẹp: người đọc kém không còn tìm thấy cỡ thật to ở đây, họ phải dùng
 * zoom của trình duyệt hoặc zoom hai ngón (`userScalable` không bị khoá). Nếu có
 * ai báo lại, cách sửa là THÊM mức thứ tư vào đây — đừng bơm cỡ gốc, vì làm thế
 * là đổi mặc định của tất cả mọi người.
 *
 * Không có mức nhỏ hơn "Chữ nhỏ": bậc caption khi đó tụt xuống dưới ~12px, chỗ
 * dấu thanh tiếng Việt bắt đầu vỡ (xem thang chữ trong globals.css).
 */

const OPTIONS = [
  { value: "sm", label: "Chữ nhỏ", scale: 1 },
  { value: "md", label: "Chữ vừa", scale: 1.2 },
  { value: "lg", label: "Chữ lớn", scale: 1.3333 },
] as const;

type Value = (typeof OPTIONS)[number]["value"];

function apply(value: Value) {
  const root = document.documentElement;
  root.classList.remove("fs-md", "fs-lg");
  if (value !== "sm") root.classList.add(`fs-${value}`);
  try {
    localStorage.setItem("fs", value);
  } catch {
    // Chặn cookie/storage thì thôi, chỉ mất phần nhớ lựa chọn.
  }
}

function currentFromDom(): Value {
  const c = document.documentElement.classList;
  return c.contains("fs-lg") ? "lg" : c.contains("fs-md") ? "md" : "sm";
}

export function FontSizeControl() {
  // Lần render trên server không biết class trên <html>, nên phải trả về cùng
  // một giá trị ở cả hai phía rồi mới đọc DOM sau khi hydrate. Script chặn
  // trong <head> đã áp class từ trước, nên chữ không hề nháy cỡ.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [picked, setPicked] = useState<Value | null>(null);
  const value = picked ?? (mounted ? currentFromDom() : null);

  return (
    <div
      role="radiogroup"
      aria-label="Cỡ chữ"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              apply(o.value);
              setPicked(o.value);
            }}
            className={cn(
              "flex min-h-[72px] flex-col justify-center gap-1 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              active
                ? "border-primary bg-primary-surface"
                : "border-input bg-card hover:bg-sunken"
            )}
          >
            <span className="flex items-center gap-2 text-label">
              {o.label}
              {active && <Check className="size-4 text-primary" />}
            </span>
            {/* Câu mẫu ở đúng cỡ của lựa chọn đó — px, KHÔNG rem. `rem` quy về
                cỡ gốc hiện hành, nên ba câu mẫu cùng phóng lên theo mức đang
                chọn: đứng ở "Chữ lớn" thì câu của "Chữ nhỏ" cũng hiện ở 20px,
                tức xem trước nói dối. Px giữ ba mẫu đứng yên để so được. */}
            <span
              className="num text-muted-foreground"
              style={{ fontSize: `${Math.round(o.scale * 15)}px`, lineHeight: 1.4 }}
            >
              Ăn sáng 45.000 ₫
            </span>
          </button>
        );
      })}
    </div>
  );
}
