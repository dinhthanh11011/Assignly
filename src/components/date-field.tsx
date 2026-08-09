"use client";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describedBy } from "@/components/field";
import { cn } from "@/lib/utils";

/**
 * Ô chọn ngày kèm nút xoá.
 *
 * Safari trên iOS không có cách nào xoá ô `<input type="date">` đã có giá trị:
 * bàn phím ngày chỉ cho lăn chọn, không có mục "trống" và cũng không nhận nút
 * Backspace. Nút "Xoá" là đường duy nhất để trả ô về rỗng — cần cho các ngày
 * không bắt buộc (hạn trả) và cũng tiện cho ngày bắt buộc khi muốn chọn lại.
 *
 * NÚT XOÁ NẰM Ở HÀNG NHÃN, KHÔNG NẰM ĐÈ TRONG Ô — và đó là chuyện bề rộng, không
 * phải thẩm mỹ. Ruột của ô ngày do trình duyệt vẽ và gần như không co được: đo ở
 * màn 320px với cỡ chữ lớn, dãy "dd/mm/yyyy" + nút lịch cần ~204px trong khi ô
 * chỉ còn ~131px sau khi chừa 44px cho nút xoá — nút lịch bị cắt mất một nửa và
 * nút xoá đè lên nó. Trả 44px đó về cho ô là vừa đủ để mọi thứ nằm trong màn
 * hình ở mọi cỡ chữ, mà không phải bóp cỡ chữ của ô ngày xuống.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  required,
  hint,
  className,
  children,
  invalid,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: React.ReactNode;
  className?: string;
  /** Nút bấm nhanh hiện dưới ô (VD: các mốc hạn trả gợi ý). */
  children?: React.ReactNode;
  invalid?: boolean;
  /** Dòng lỗi — dựng bằng <FieldError id={`${id}-error`}/>. */
  error?: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Hàng nhãn cao cố định `min-h-7` DÙ CHƯA CÓ nút xoá: nút chỉ hiện khi ô đã
          có ngày, nên nếu hàng co theo nó thì vừa chọn xong ngày là cả form nhảy
          xuống một nấc — trên desktop nơi form dài hiện trọn, cú nhảy đó kéo theo
          mọi thứ bên dưới ngay dưới con trỏ.
          Nút vì thế nằm NGOÀI luồng (absolute): vùng chạm 44px của nó không phụ
          thuộc vào cỡ chữ hiện tại nên không cách nào bù bằng margin âm cho khớp
          ở cả ba bậc chữ — lấy nó ra khỏi luồng là hết chuyện. */}
      <div className={cn("relative flex min-w-0 items-center gap-2", value && "pr-20")}>
        <Label htmlFor={id} className="min-w-0">
          {label}
        </Label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Xoá ${label.toLowerCase()}`}
            // min-h-[44px] chứ không min-h-11: cỡ gốc của app là 15px nên 11
            // (2.75rem) chỉ ra 41px — sàn px cứng, cùng lý do với button.tsx.
            className="absolute right-0 top-1/2 flex min-h-[44px] -translate-y-1/2 items-center gap-1 rounded-md px-2 text-label text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-4" />
            Xoá
          </button>
        )}
      </div>
      {/* px-3 (thay vì px-4 của ô nhập thường): ruột ô ngày do trình duyệt vẽ và
          gần như không co được, nên 8px lề lấy lại ở đây là 8px cho nó. */}
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={invalid || undefined}
        // Chú thích dưới ô trước đây chỉ NHÌN thấy được — nó nằm cạnh ô nhưng
        // không nối vào ô, nên máy đọc màn hình bỏ qua hoàn toàn. Câu quan
        // trọng nhất bị mất theo cách này là hint hạn trả ở loan-dialog.
        aria-describedby={describedBy(hint && `${id}-hint`, error && `${id}-error`)}
        className="px-3"
      />
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error}
    </div>
  );
}
