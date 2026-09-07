"use client";
import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavTransition } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

/**
 * Ô TÌM KIẾM đặt chữ đang tìm lên URL.
 *
 * Tách khỏi `filter-bar.tsx` (nơi nó ra đời) khi trang Nợ cũng cần tìm: cả ba
 * chỗ dùng — Ghi chép, Nợ, kho lưu — đều phải cùng một nhịp debounce, cùng nút
 * xoá, cùng cái luật "một ký tự thì chưa tìm", nếu không thì cùng một ô nhập
 * lại hành xử khác nhau ở ba trang.
 *
 * Vì sao là searchParams + điều hướng chứ không phải state ở client: bộ lọc
 * phải sống sót qua phân trang ("Tải thêm" ở Ghi chép, `?page=` ở kho lưu) —
 * server phải nhận được nguyên bộ điều kiện, nếu không trang 2 lọc khác trang 1.
 * Ngoài ra URL còn chia sẻ được, nút Back hoạt động, và thanh tiến trình sẵn có
 * tự chạy.
 */
export function SearchBox({
  value,
  param = "q",
  label,
  placeholder = "Tìm…",
  clear,
  className,
}: {
  /** Chữ đang tìm, đọc từ URL của trang (server truyền xuống). */
  value?: string;
  param?: string;
  /** Máy đọc màn hình cần biết ô này tìm trong cái gì. */
  label: string;
  placeholder?: string;
  /**
   * Các tham số bị xoá khi chữ tìm đổi. Dùng cho số trang: đổi chữ tìm khi đang
   * ở trang 4 mà giữ `?page=4` thì kết quả mới thường ngắn hơn và người dùng
   * rơi vào một trang rỗng.
   */
  clear?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useNavTransition();

  const [draft, setDraft] = useState(value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Người dùng bấm chip "xoá tìm kiếm" hay bấm Back → ô nhập phải theo URL.
  // Chỉnh state NGAY TRONG LÚC RENDER thay vì trong useEffect: React tự vẽ lại
  // trước khi kịp hiện gì lên màn, nên không có nhịp nháy nào — còn effect thì
  // vẽ giá trị cũ trước rồi mới sửa. Đây là pattern chính thức của React cho
  // "state cần theo prop" (You Might Not Need an Effect).
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    setDraft(value ?? "");
  }

  const commit = (next: string) => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = next.trim();
    // MỘT KÝ TỰ CŨNG TÌM. Bản đầu bỏ qua chuỗi 1 ký tự với lý do "quét gần hết
    // bảng mà chẳng thu hẹp gì" — nhưng người dùng báo lại đúng chuyện này: gõ
    // "v" thì ô nhập hiện "v" mà danh sách đứng im, không cách nào phân biệt
    // với ô tìm kiếm bị hỏng. Một lần quét thêm rẻ hơn nhiều so với việc người
    // dùng mất niềm tin vào cái ô.
    const sp = new URLSearchParams(params.toString());
    if (trimmed) sp.set(param, trimmed);
    else sp.delete(param);
    for (const key of clear ?? []) sp.delete(key);
    const qs = sp.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    // replace chứ không push: nếu không, mỗi phím gõ thành một mục trong lịch
    // sử và người dùng phải bấm Back mười lần để về chỗ cũ.
    startTransition(() => router.replace(url));
  };

  const onChange = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 400);
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          commit(draft);
        }}
        className="px-11"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            commit("");
          }}
          aria-label="Xoá chữ đang tìm"
          className="focus-ring absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  );
}
