import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RowIcon, rowClass } from "@/components/ui/row";

/**
 * Các hàng của trang Cài đặt — kiểu Settings của iOS: một trang dài toàn hàng
 * full-width có nhãn chữ.
 *
 * Vì sao là hàng chứ không phải lưới thẻ: hàng đọc từ trên xuống theo đúng thứ
 * tự, mỗi hàng là một câu, và vùng bấm rộng bằng cả màn hình. Lưới thẻ bắt mắt
 * phải quét hai chiều và mỗi ô là một vùng bấm nhỏ hơn.
 */

export function SettingGroup({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
        <h2 className="text-label text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </div>
    </section>
  );
}

/** Hàng dẫn sang một trang khác. Bấm được cả hàng. */
export function LinkRow({
  href,
  icon: Icon,
  label,
  hint,
  badge,
  tone = "primary",
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  hint?: string;
  badge?: React.ReactNode;
  tone?: "primary" | "expense";
}) {
  return (
    <Link
      href={href}
      className={rowClass()}
    >
      <RowIcon icon={Icon} tone={tone} />
      <div className="min-w-0 flex-1">
        {/* Nhãn ở đây là tên một trang ("Loại thu chi", "Thành viên sổ chung"),
            dài hai ba từ chứ không phải dữ liệu người dùng nhập — nên nó xuống
            dòng chứ không cắt. Ở cỡ chữ lớn bản cũ ra "Loại thu …". */}
        <div className={cn("text-body-lg", tone === "expense" && "text-destructive")}>{label}</div>
        {/* Câu giải thích thì xuống dòng, không cắt bằng "…" — hàng cao thêm
            một dòng là cái giá rẻ hơn nhiều so với một câu cụt. */}
        {hint && <div className="text-caption text-muted-foreground">{hint}</div>}
      </div>
      {badge}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Hàng chứa một control (công tắc, nhóm nút…) thay vì dẫn đi đâu. */
export function ControlRow({
  icon: Icon,
  label,
  hint,
  children,
  stacked = false,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  children: React.ReactNode;
  /** Control xuống dòng riêng bên dưới — dùng khi nó rộng (nhóm 3 nút…). */
  stacked?: boolean;
}) {
  return (
    <div className={cn("px-4 py-3.5", stacked ? "space-y-3" : "flex min-h-16 items-center gap-3.5")}>
      {/* flex-wrap + basis-40 cho phần chữ: control ở đây là nút có
          whitespace-nowrap, bề rộng gốc của nó ~190px nên thuật toán flex chia
          cho nó trước và phần chữ chỉ còn ~49px — nhãn "Báo cho tôi khi có việc
          mới" xuống thành BẢY dòng, mỗi dòng một chữ, ngay ở cỡ chữ mặc định.
          Đặt sàn 10rem cho phần chữ thì khi không đủ chỗ nút tự rơi xuống dòng
          dưới (đúng như `stacked`) thay vì bóp chữ. `grow basis-40` chứ không
          `flex-1 basis-40`: flex-1 là shorthand có set luôn flex-basis. */}
      <div className={cn("flex flex-wrap items-center gap-3.5", stacked && "w-full")}>
        <RowIcon icon={Icon} tone="primary" />
        <div className="min-w-0 grow basis-40">
          <div className="text-body-lg">{label}</div>
          {hint && <div className="text-caption text-muted-foreground">{hint}</div>}
        </div>
        {!stacked && children}
      </div>
      {stacked && children}
    </div>
  );
}
