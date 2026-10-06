"use client";
import { useState, useTransition } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { call } from "@/lib/action-result";
import { createCategory } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPicker } from "@/components/icon-picker";
import { cn } from "@/lib/utils";
import type { CategoryOption, TxType } from "./types";

/** Số ô hiện sẵn khi lưới thu gọn — đủ hai hàng 4 ô kể cả ô "Thêm". */
const COLLAPSED = 7;

const tileBase =
  "focus-ring relative flex min-h-[5.25rem] min-w-0 flex-col items-center justify-start gap-1.5 rounded-xl border px-1 pb-2 pt-2.5 text-center text-caption leading-tight transition-colors duration-150";

/**
 * Lưới chọn loại. `categories` đã xếp theo mức dùng (xem `getCategoryOptions`),
 * nên hai hàng đầu gần như luôn có loại cần chọn; phần còn lại sau một cú bấm.
 *
 * Chọn được nhiều loại: loại bấm đầu là loại chính (hiện ở danh sách), nên khi
 * chọn từ hai loại trở lên mỗi ô đánh số thứ tự. Tạo loại mới ngay tại đây.
 */
export function CategoryPicker({
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
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(type === "INCOME" ? "💰" : "📦");
  const [pending, start] = useTransition();

  // Loại đã chọn mà nằm ngoài hai hàng đầu (sửa khoản, chép khoản) vẫn phải
  // hiện ra — không bao giờ giấu một lựa chọn đang bật.
  const head = categories.slice(0, COLLAPSED);
  const extra = categories.slice(COLLAPSED).filter((c) => value.includes(c.id));
  const shown = expanded ? categories : [...head, ...extra];
  const hidden = categories.length - shown.length;

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function create() {
    const trimmed = name.trim();
    // `pending` chặn bấm lần hai: hai lời gọi song song cùng lọt kiểm tra trùng
    // tên ở server, cái sau đâm vào unique index.
    if (!trimmed || pending) return;
    start(async () => {
      try {
        const created = await call(createCategory({ groupId, name: trimmed, type, icon }));
        onCreated(created);
        setName("");
        setAdding(false);
        toast.success("Đã thêm loại");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    // role="group": đây là lưới nút, không có MỘT control nào cho <label for>.
    <div
      role="group"
      aria-labelledby="tx-category-label"
      aria-describedby="tx-category-hint"
      className="@container space-y-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span id="tx-category-label" className="text-label text-foreground">
          Khoản này là gì?
        </span>
        <span id="tx-category-hint" className="text-caption text-muted-foreground">
          {value.length > 1 ? `${value.length} loại · số 1 là loại chính` : "Chọn được nhiều loại"}
        </span>
      </div>

      <div className="-mx-1 grid grid-cols-3 gap-2 px-1 py-1 @min-[21em]:grid-cols-4 @min-[32em]:grid-cols-5">
        {shown.map((c) => {
          const order = value.indexOf(c.id);
          const on = order >= 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              aria-pressed={on}
              className={cn(
                tileBase,
                on
                  ? "border-primary bg-primary-surface font-semibold text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-sunken hover:text-foreground"
              )}
            >
              {/* Dấu chọn có HÌNH (tick/số), không chỉ đổi màu nền. */}
              {on && (
                <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground">
                  {value.length > 1 ? order + 1 : <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg text-title leading-none",
                  on ? "bg-card" : "bg-sunken"
                )}
              >
                {c.icon ?? "📁"}
              </span>
              <span className="line-clamp-2 w-full break-words">{c.name}</span>
            </button>
          );
        })}

        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cn(tileBase, "border-dashed border-border-strong text-muted-foreground hover:bg-sunken hover:text-foreground")}
          >
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg">
              <ChevronDown className="size-5" />
            </span>
            <span>Thêm {hidden} loại</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
            className={cn(tileBase, "border-dashed border-border-strong text-muted-foreground hover:bg-sunken hover:text-foreground")}
          >
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Plus className="size-5" />
            </span>
            <span>Loại mới</span>
          </button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 rounded-xl border border-border bg-sunken p-3">
          <div className="flex gap-2">
            <span
              aria-hidden
              className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-title"
            >
              {icon}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "INCOME" ? "VD: Lương" : "VD: Ăn uống"}
              aria-label="Tên loại mới"
              autoFocus
              enterKeyHint="done"
              // Enter ở đây là "lưu loại", không phải gửi cả khoản.
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                create();
              }}
            />
            <Button type="button" size="icon" loading={pending} onClick={create} aria-label="Lưu loại">
              {!pending && <Check />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setAdding(false)}
              aria-label="Thôi, không thêm nữa"
            >
              <X />
            </Button>
          </div>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      )}

      {categories.length === 0 && !adding && (
        <p className="text-caption text-muted-foreground">
          Chưa có loại nào — bấm “Loại mới” để tạo.
        </p>
      )}
    </div>
  );
}
