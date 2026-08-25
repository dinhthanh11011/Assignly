"use client";
import { TriangleAlert, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describedBy } from "@/components/field";
import { cn, dayFieldSummary, formatDate, formatWeekday, shiftDateKey } from "@/lib/utils";

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
  showRelative,
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
  /**
   * Đọc lại ngày đang chọn thành câu người đọc được ("Thứ Hai, 24/08/2026 ·
   * Hôm qua") và cảnh báo khi ngày trông như chọn nhầm. Bật cho những ô hỏi
   * "việc này xảy ra ngày nào"; ô hạn trả trong tương lai thì không.
   */
  showRelative?: boolean;
}) {
  const summary = showRelative && value ? dayFieldSummary(value) : null;
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
        aria-describedby={describedBy(
          summary && `${id}-relative`,
          hint && `${id}-hint`,
          error && `${id}-error`
        )}
        className="px-3"
      />
      {/* Câu đọc lại NẰM TRÊN các nút bấm nhanh: nó là câu trả lời cho "tôi vừa
          chọn ngày nào", nên phải dính ngay dưới ô. Có icon khi cảnh báo, vì
          màu vàng một mình không được là kênh duy nhất mang tin. */}
      {summary && (
        <p
          id={`${id}-relative`}
          className={cn(
            "flex items-start gap-1.5 text-caption",
            summary.caution ? "text-warning" : "text-muted-foreground"
          )}
        >
          {summary.caution && <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span>
            {formatWeekday(value)}, {formatDate(value)} · {summary.text}
          </span>
        </p>
      )}
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

/** Các mốc bấm nhanh của `DayQuickPicks`, tính lùi từ hôm nay. */
const DAY_PRESETS = [
  { label: "Hôm nay", days: 0 },
  { label: "Hôm qua", days: -1 },
  { label: "Hôm kia", days: -2 },
];

/**
 * Ba nút "Hôm nay / Hôm qua / Hôm kia" đặt ngay dưới ô ngày.
 *
 * Gần như mọi khoản ghi bù đều rơi vào ba ngày này — tối qua quên ghi, sáng nay
 * mới nhớ. Trước đây đường duy nhất là mở bàn phím ngày của hệ điều hành rồi lăn
 * đúng một nấc, thao tác vừa chậm vừa là chỗ lăn nhầm sang ô tháng hoặc ô năm.
 *
 * Xa hơn ba ngày thì vẫn dùng ô ngày như cũ — thêm nút nữa chỉ làm hàng này dài
 * ra mà không bớt được lần mở bàn phím ngày nào.
 */
export function DayQuickPicks({
  value,
  onChange,
  label = "Chọn nhanh ngày",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {DAY_PRESETS.map((p) => {
        const key = shiftDateKey("", p.days);
        const active = value === key;
        return (
          <button
            key={p.days}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={cn(
              "focus-ring min-h-11 rounded-lg border px-4 text-label transition-colors",
              active
                ? "border-primary bg-primary-surface font-semibold text-primary"
                : "border-input bg-card text-muted-foreground hover:border-primary hover:text-primary"
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
