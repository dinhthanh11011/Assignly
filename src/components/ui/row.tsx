import { cn } from "@/lib/utils";

/**
 * Hình dáng chuẩn của một HÀNG BẤM ĐƯỢC.
 *
 * Sáu chỗ trong app từng chép tay gần đúng cùng chuỗi class này, và chúng đã
 * trôi khỏi nhau: khoảng cách giữa icon và chữ chạy từ `gap-3` tới `gap-4`,
 * chiều cao tối thiểu từ `min-h-16` tới `min-h-20` tới `min-h-[76px]`, và vòng
 * tiêu điểm thì mỗi nơi một kiểu. Không có khác biệt nào trong số đó là cố ý —
 * chúng chỉ là kết quả của việc chép rồi sửa.
 *
 * Xuất ra CẢ chuỗi class lẫn component, và đó là chủ ý: ruột của hàng giao dịch
 * (số tiền, loại, người trả, ngày) đặc thù tới mức ép nó qua props sẽ làm API
 * của Row phình ra vô nghĩa. Chỗ đó chỉ mượn `rowClass()`.
 *
 * Vòng tiêu điểm mặc định là bản INSET: hàng gần như luôn nằm trong một ngăn
 * `divide-y overflow-hidden`, mà ngăn đó cắt mất phần vòng vẽ ra ngoài mép.
 */
export function rowClass(opts?: { size?: "default" | "tall"; container?: "flush" | "card" }) {
  const { size = "default", container = "flush" } = opts ?? {};
  return cn(
    "flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors",
    "hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50",
    size === "tall" ? "min-h-20" : "min-h-16",
    container === "card"
      ? "focus-ring rounded-xl border border-border bg-card"
      : "focus-ring-inset"
  );
}

/* ─── HÀNG CÓ SỐ TIỀN Ở CUỐI ────────────────────────────────────────────────
   Ba chỗ vẽ cùng một hàng "icon · tên khoản · số tiền · mũi tên": danh sách
   chính, hàng chờ gửi, và sheet của một ngày.

   Ở bố cục cũ, ô chữ là `min-w-0 flex-1` còn số tiền `shrink-0`. `min-w-0`
   nghĩa là ô chữ được phép co tới TẬN 0 — và ở màn hình 320px với cỡ chữ lớn nó
   co tới 0 thật: icon 3rem + số tiền ~8rem + mũi tên + ba khe 0,875rem đã vượt
   bề rộng hàng, nên phần duy nhất co được bị lấy sạch. Hàng còn lại một cái
   icon, một con số và một mũi tên — KHÔNG CÒN TÊN KHOẢN. Đo được: ô chữ rộng
   0px ở 320×1,3333.

   Cách sửa không phải là bóp số tiền hay hạ cỡ chữ, mà là cho hàng XUỐNG DÒNG:
   cụm "icon + tên khoản" có sàn bề rộng (xem `rowLeadClass`), và khi phần còn
   lại không đủ chỗ cho số tiền thì cụm số tiền + mũi tên rớt xuống dòng dưới,
   `ml-auto` đẩy nó về mép phải. Không có breakpoint nào ở đây là cố ý: ngưỡng
   tự đúng ở mọi cặp (bề rộng × cỡ chữ), kể cả những cặp chưa ai thử. */
export function moneyRowClass(opts?: Parameters<typeof rowClass>[0]) {
  return cn(rowClass(opts), "flex-wrap gap-y-1");
}

/**
 * Nửa đầu hàng — icon DÍNH với tên khoản, và cụm này là thứ quyết định lúc nào
 * hàng xuống dòng.
 *
 * Đặt sàn lên riêng ô chữ thì ở màn hẹp chính cái icon rớt xuống dòng trước, để
 * lại một dòng chỉ có mỗi hình vuông màu.
 *
 * `flex-[1_1_13rem]` chứ KHÔNG PHẢI `min-w-52`, và khác biệt đó có thật: bề
 * rộng mong muốn 13rem (icon 3rem + khe + chỗ cho ~9rem chữ) là thứ flexbox
 * dùng để quyết định có xuống dòng hay không, nhưng `min-w-0` vẫn cho cụm co
 * nhỏ hơn thế KHI NÓ ĐÃ Ở MỘT MÌNH TRÊN DÒNG. Sàn cứng thì không: trong những
 * khung hẹp hơn 13rem (danh sách nằm trong thẻ có padding, sheet của một ngày…)
 * nó đẩy chữ tràn ra ngoài mép thẻ thay vì cắt bằng "…".
 */
export const rowLeadClass = "flex min-w-0 flex-[1_1_13rem] items-center gap-3.5";

/** Ô chữ bên trong cụm đầu hàng: đây mới là chỗ được co và cắt bằng "…". */
export const rowTextClass = "min-w-0 flex-1";

/** Cụm cuối hàng (số tiền + mũi tên): dính vào nhau, dạt phải khi xuống dòng. */
export const rowTrailClass = "ml-auto flex shrink-0 items-center gap-3";

/** Ô vuông chứa icon ở đầu hàng. */
export function RowIcon({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: React.ElementType;
  tone?: "primary" | "income" | "expense" | "warning" | "neutral";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary-surface text-primary",
    income: "bg-income-surface text-income",
    expense: "bg-expense-surface text-expense",
    warning: "bg-warning-surface text-warning",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg",
        tones[tone],
        className
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}
