"use client";
import { useState } from "react";
import { Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Emoji gợi ý khi tạo / sửa loại. */
export const SUGGESTED_ICONS = [
  "🍜", "🛵", "🏠", "🧾", "🛍️", "💊", "🎬", "📚", "✈️", "🎓",
  "💰", "🎁", "🏪", "📈", "💼", "🐶", "👶", "☕", "⚡", "📦",
];

/** Giới hạn của cột `icon` phía server — một emoji ghép (cờ, gia đình) dài hơn
    một ký tự rất nhiều, nên đo bằng độ dài chuỗi chứ không phải "1 ký tự". */
export const ICON_MAX_LENGTH = 24;

/**
 * Lấy đúng MỘT emoji từ chuỗi người dùng dán vào. Không cắt theo ký tự được:
 * "👨‍👩‍👧" là 8 code unit và "🇻🇳" là 4 — cắt thô sẽ ra nửa emoji hỏng. Cắt theo
 * grapheme là cách duy nhất giữ nguyên cụm.
 */
export function firstGrapheme(input: string) {
  const text = input.trim();
  if (!text) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const first = new Intl.Segmenter(undefined, { granularity: "grapheme" })
      .segment(text)[Symbol.iterator]()
      .next();
    if (!first.done) return first.value.segment.slice(0, ICON_MAX_LENGTH);
  }
  return (Array.from(text)[0] ?? "").slice(0, ICON_MAX_LENGTH);
}

export function IconPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  // Emoji người dùng tự chọn thì không nằm trong danh sách gợi ý — phải hiện
  // thêm một ô riêng, nếu không thì nhìn như chưa chọn gì cả.
  const custom = Boolean(value) && !SUGGESTED_ICONS.includes(value);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState(custom ? value : "");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1">
        {SUGGESTED_ICONS.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-pressed={value === i}
            className={cn(
              "size-8 rounded-sm text-body leading-none transition-colors",
              value === i ? "bg-primary-surface ring-1 ring-primary" : "bg-card hover:bg-muted"
            )}
          >
            {i}
          </button>
        ))}

        {custom && (
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setTyping(true);
            }}
            aria-pressed
            aria-label={`Emoji tự chọn ${value}, bấm để đổi`}
            className="size-8 rounded-sm bg-primary-surface text-body leading-none ring-1 ring-primary"
          >
            {value}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setDraft(custom ? value : "");
            setTyping((v) => !v);
          }}
          aria-expanded={typing}
          aria-label="Dùng emoji khác"
          className={cn(
            "flex size-8 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground transition-colors hover:text-foreground",
            typing && "text-foreground"
          )}
        >
          <Smile className="size-4" />
        </button>
      </div>

      {typing && (
        <div className="space-y-1">
          <Input
            value={draft}
            // Nhận nguyên chuỗi vào draft (để người dùng thấy mình vừa gõ gì)
            // nhưng chỉ gả emoji ĐẦU TIÊN ra ngoài. Dán cả câu vào thì lấy
            // emoji/ký tự đầu, không báo lỗi.
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              onChange(firstGrapheme(raw));
            }}
            // Enter ở đây là "xong", không phải gửi form đang bọc bên ngoài.
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              setTyping(false);
            }}
            autoFocus
            maxLength={ICON_MAX_LENGTH}
            aria-label="Emoji tự chọn"
            placeholder="Dán hoặc gõ emoji bất kỳ"
            className="bg-card"
          />
          <p className="text-caption text-muted-foreground">
            Mở bảng emoji: điện thoại bấm mặt cười trên bàn phím, máy tính bấm{" "}
            <kbd className="font-sans">Win</kbd> + <kbd className="font-sans">.</kbd> (Windows) hoặc{" "}
            <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">Cmd</kbd> +{" "}
            <kbd className="font-sans">Space</kbd> (Mac).
          </p>
        </div>
      )}
    </div>
  );
}
