import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpCircle,
  Scale,
  Wallet,
} from "lucide-react";
import { CreateGroupButton, JoinGroupButton } from "@/components/group-dialogs";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { rowClass } from "@/components/ui/row";
import { cn, formatMoney } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   NGUYÊN TẮC BẤT BIẾN CỦA GIAO DIỆN — soi những điều này khi review.

   1. MỖI ROUTE MỘT ĐỘNG TỪ.
        `/`         = ghi và xem lại từng khoản
        `/loans`    = ai nợ ai
        `/reports`  = nhìn xu hướng
        `/settings` = chỉnh sửa

   2. `BalanceHero` CHỈ ĐƯỢC MOUNT Ở ĐÚNG MỘT ROUTE: `/reports`.
      Trước đây nó nằm trên ba route cộng thêm một bản chép tay ở trang Cân đối —
      đó chính là lý do người dùng báo "trang tổng quan và trang giao dịch giống nhau".
      Giới hạn nó về một chỗ khiến câu hỏi "mình đang ở trang nào?" trả lời được
      trong 100ms.

   3. DANH SÁCH CÁC KHOẢN CHỈ XUẤT HIỆN Ở ĐÚNG MỘT ROUTE: `/`.
      Không có khối "giao dịch gần đây" ở bất kỳ đâu khác. Lịch tháng
      (`/?view=lich`) không phải ngoại lệ: nó là CÁCH XEM KHÁC của đúng danh sách
      đó, cùng tháng và cùng bộ lọc, nằm trên cùng route.

   4. CHI TIẾT MỘT KHOẢN LÀ MÀN ĐỌC, KHÔNG PHẢI FORM.
      Bấm một hàng trong sổ mở `TransactionDetailDialog` — không ô nhập nào. Sửa
      và xoá đi ra từ đáy sheet đó, và đó là đường DUY NHẤT: không có menu "⋮"
      trên hàng nữa (nút lồng trong nút, và là mục tiêu bấm 44px cạnh một hàng
      bấm được).

   5. BỘ CHỌN THÁNG CHỈ Ở `/` VÀ `/reports`.
      Ở `/` nó chọn tháng của cuốn sổ; ở `/reports` nó là một trong ba kiểu chọn
      khoảng (từng tháng / N tháng gần đây / tự chọn ngày, xem `@/lib/range`) —
      "tháng 6 tôi tiêu vào những gì" là câu người dùng hỏi nhiều nhất mà bản cũ
      không có cách nào hỏi. `/loans` thì KHÔNG: nợ cố tình tính toàn thời gian,
      nó không reset theo tháng.

   6. BỘ CHỌN SỔ XUẤT HIỆN 0 LẦN TRONG THÂN TRANG. Nó vốn là cookie toàn cục
      nên nó thuộc về khung app (sidebar / thanh trên), không phải header trang.

   7. MỌI CỠ CHỮ ĐI QUA THANG text-* — không `text-[Npx]`, không viết hoa toàn
      chữ, không tự giãn/bóp chữ ở từng chỗ.
      Sàn "không chữ nào dưới 14px, thứ gì cần đọc thì ≥17px" đã BỎ: cỡ gốc nay
      là 15px và ai cần to hơn thì có cần gạt cỡ chữ nhỏ/vừa/lớn (tới 1,33×, tức
      20px). Cái còn lại là một sàn vật lý, không phải chính sách — dưới ~12px dấu
      thanh tiếng Việt vỡ,
      nên đừng thêm bậc nào nhỏ hơn caption. Ô nhập là ngoại lệ ngược: chúng có
      sàn 16px (`text-field`) vì iOS tự phóng to trang khi focus vào field nhỏ hơn.

   8. KHÔNG THÔNG TIN NÀO CHỈ DO MÀU MANG — luôn kèm ít nhất hai trong: một từ,
      một dấu +/−, một icon, một màu.

   9. KHÔNG NÚT NÀO DƯỚI 44×44px. Không affordance nào chỉ hiện khi hover.

   Quy tắc 2, 3, 5, 6 khiến hai trang KHÔNG THỂ chung một dáng: `/` là dải tháng
   sáng + danh sách (hoặc lịch); `/loans` là hai tab + hai thẻ tóm tắt;
   `/reports` là bộ chọn khoảng + một hero + biểu đồ; `/settings` là các hàng xám.
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Hiện khi người dùng chưa thuộc sổ nào — mọi trang dữ liệu đều cần một sổ.
 *
 * Nút chính MỞ THẲNG hộp thoại tạo sổ, không phải link sang `/groups`. Bản cũ
 * viết "Tạo sổ ngay" nhưng lại dẫn sang một trang danh sách đang rỗng, rồi bắt
 * bấm thêm một nút nữa mới gõ được tên: hai màn hình chen giữa lời hứa và việc
 * làm được nó, ngay ở màn hình đầu tiên người dùng gặp.
 */
export function NoGroupState() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-xl bg-primary">
          <Wallet className="size-8 text-primary-foreground" />
        </span>
        <h1 className="text-page">Chào mừng đến Sổ Thu Chi</h1>
        <p className="mt-2.5 text-body text-muted-foreground">
          Tạo sổ đầu tiên để bắt đầu ghi tiền vào tiền ra, theo dõi tiền cho mượn và nhắc tới hẹn
          trả. Dùng riêng hoặc mời người thân ghi chung.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          {/* redirectTo="/" — người vừa tạo sổ đầu tiên đi thẳng tới trang ghi
              chép, không phải màn quản trị thành viên. */}
          <CreateGroupButton size="lg" className="w-full" label="Tạo sổ đầu tiên" redirectTo="/" />
          <JoinGroupButton size="lg" className="w-full" label="Đã có mã? Vào sổ chung" />
        </div>
        <Link
          href="/groups"
          className="focus-ring mt-4 inline-flex min-h-12 items-center gap-1.5 rounded-lg text-body text-muted-foreground transition-colors hover:text-foreground"
        >
          Xem tất cả sổ của tôi <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/**
 * Màn hình một-thông-báo chiếm trọn khung: lỗi, không tìm thấy trang, chưa có sổ.
 *
 * Trước đây app có `loading.tsx` ở cả 8 route nhưng KHÔNG có lấy một `error.tsx`
 * hay `not-found.tsx` nào — nghĩa là mọi thứ chạy tốt thì được chăm chút, còn khi
 * hỏng thì người dùng rơi thẳng vào trang lỗi mặc định của Next: tiếng Anh, mất
 * theme, mất cỡ chữ đã chọn, mất luôn thanh điều hướng. Trong một app 100% tiếng
 * Việt mà người lớn tuổi là nhóm dùng chính, đó là ngõ cụt chứ không phải thông báo.
 *
 * Hình học lấy đúng của NoGroupState để ba màn này là một họ.
 */
export function MessageScreen({
  icon: Icon,
  tone = "muted",
  title,
  children,
  actions,
  footnote,
  className,
}: {
  icon: React.ElementType;
  /** `muted` cho "không có gì ở đây", `expense` cho "có gì đó hỏng". */
  tone?: "muted" | "expense" | "primary";
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Dòng nhỏ cuối cùng — dùng cho mã lỗi. */
  footnote?: React.ReactNode;
  /** Màn ở ngoài (app)/layout thì truyền min-h-dvh: chúng không có <main> bao. */
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    expense: "bg-expense-surface text-expense",
    primary: "bg-primary text-primary-foreground",
  };
  return (
    <div
      className={cn(
        "flex min-h-[70dvh] flex-col items-center justify-center px-6",
        className
      )}
    >
      <div className="w-full max-w-sm text-center">
        <span
          className={cn(
            "mx-auto mb-6 flex size-16 items-center justify-center rounded-xl",
            tones[tone]
          )}
        >
          <Icon className="size-8" aria-hidden />
        </span>
        <h1 className="text-page">{title}</h1>
        <div className="mt-2.5 text-body text-muted-foreground">{children}</div>
        {actions && <div className="mt-7 flex flex-col gap-2.5">{actions}</div>}
        {footnote && <p className="mt-5 text-caption text-muted-foreground">{footnote}</p>}
      </div>
    </div>
  );
}

/**
 * Hàng "quay lại" ở đầu các trang con.
 *
 * Bốn trang từng chép tay đúng khối này, và một trong bốn còn ghi sai đích:
 * `/groups/[id]` nói "Quay lại Cài đặt" kể cả khi vào từ `/groups`.
 *
 * Cố ý là <Link> có đích cứng chứ KHÔNG phải router.back(): `/groups/[id]` là
 * đích của thông báo đẩy (xem join.ts) nên nó thường được mở nguội, lúc đó
 * lịch sử duyệt rỗng và back() không đi đâu cả.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-lg text-body text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-5" aria-hidden /> {label}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-page">{title}</h1>
        {/* Phụ đề là MỘT CÂU nói trang này để làm gì, không phải nhãn viết hoa. */}
        {subtitle && <p className="mt-1 text-body text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * Panel số dư lớn. CHỈ DÙNG Ở `/reports` — xem quy tắc 2 ở đầu file.
 *
 * Bản cũ ép nền ink tối + ba vệt gradient + chữ trắng ở CẢ HAI theme. Nghĩa là
 * ở nền sáng, con số quan trọng nhất app nằm trên một vùng tối không đều, không
 * đo được tương phản; còn ở nền tối nó nằm trên một sắc tối *khác* với trang,
 * đọc ra như một app khác chen vào. Nay là một thẻ thường và để con số tự làm
 * việc của nó.
 */
export function BalanceHero({
  label,
  balance,
  income,
  expense,
  footer,
}: {
  label: string;
  balance: number;
  income: number;
  expense: number;
  footer?: React.ReactNode;
}) {
  const total = income + expense;
  const inShare = total > 0 ? (income / total) * 100 : 50;
  const positive = balance >= 0;

  return (
    <Card className="money-cq p-5 md:p-7">
      <p className="text-label text-muted-foreground">{label}</p>

      {/* Dấu + / − luôn hiện tường minh: màu một mình không được mang tin. */}
      <p
        className={cn(
          "num-hero mt-2 text-money-hero",
          positive ? "text-income" : "text-expense"
        )}
      >
        {positive ? "+" : "−"}
        {formatMoney(Math.abs(balance))}
      </p>

      {/* Câu, không phải chip 11px viết hoa. */}
      <p
        className={cn(
          "mt-2 flex items-center gap-2 text-body-lg",
          positive ? "text-income" : "text-expense"
        )}
      >
        {positive ? <ArrowDownCircle className="size-5" /> : <ArrowUpCircle className="size-5" />}
        {positive ? "Còn dư" : "Đang âm"}
      </p>

      {/* Thanh tỉ lệ vào/ra. Cao 12px chứ không 6px, và có aria-label đọc ra cả
          hai con số — một vạch mảnh không nói gì với người thị lực kém. */}
      <div
        role="img"
        aria-label={`Tiền vào ${formatMoney(income)}, tiền ra ${formatMoney(expense)}`}
        className="mt-5 flex h-3 overflow-hidden rounded-full bg-expense"
      >
        <span className="h-full rounded-full bg-income" style={{ width: `${inShare}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <HeroFigure label="Tiền vào" value={income} tone="in" />
        <HeroFigure label="Tiền ra" value={expense} tone="out" />
      </div>

      {footer && <div className="mt-5 border-t border-border pt-3.5 text-body">{footer}</div>}
    </Card>
  );
}

function HeroFigure({ label, value, tone }: { label: string; value: number; tone: "in" | "out" }) {
  const inbound = tone === "in";
  return (
    <div className={cn("rounded-lg px-3.5 py-3", inbound ? "bg-income-surface" : "bg-expense-surface")}>
      <div
        className={cn(
          "flex items-center gap-1.5 text-label",
          inbound ? "text-income" : "text-expense"
        )}
      >
        {inbound ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
        {label}
      </div>
      <div className="num mt-1 truncate text-money-lg text-foreground">{formatMoney(value)}</div>
    </div>
  );
}

/** Thẻ số liệu nhỏ: icon nền nhạt + giá trị + nhãn. */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: "primary" | "income" | "expense" | "warning";
  hint?: string;
}) {
  const toneClass = {
    primary: "bg-primary-surface text-primary",
    income: "bg-income-surface text-income",
    expense: "bg-expense-surface text-expense",
    warning: "bg-warning-surface text-warning",
  }[tone];

  return (
    // Hover đổi VIỀN chứ không nhấc bóng: thẻ số liệu không bấm được ở đâu cả,
    // nên "nhấc lên khi rê chuột" là hứa hão. Viền đậm lên chỉ nói "con trỏ đang
    // ở đây", đúng thứ duy nhất đang xảy ra.
    <Card className="transition-colors duration-200 hover:border-border-strong">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span
          className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg", toneClass)}
        >
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <div className="num truncate text-money-lg leading-tight">{value}</div>
          <div className="truncate text-label text-muted-foreground">{label}</div>
          {hint && <div className="truncate text-caption text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Thẻ tóm tắt sáng — thay cho panel tối ở mọi nơi KHÔNG phải `/reports`.
 * Một câu, một con số, và (tuỳ chọn) mấy ô số phụ.
 */
export function SummaryCard({
  label,
  amount,
  tone = "neutral",
  sentence,
  figures,
  children,
}: {
  /** Câu mô tả con số, ví dụ "Người ta còn nợ bạn". */
  label: string;
  amount: number;
  tone?: "income" | "expense" | "neutral";
  /** Câu giải thích thêm ở dưới, viết như nói chuyện. */
  sentence?: string;
  figures?: { label: string; value: number }[];
  children?: React.ReactNode;
}) {
  const toneClass =
    tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-foreground";

  return (
    <Card className="money-cq p-5 md:p-6">
      <p className="text-label text-muted-foreground">{label}</p>
      <p className={cn("num-hero mt-2 text-money-hero", toneClass)}>{formatMoney(amount)}</p>

      {figures && figures.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {figures.map((f) => (
            <div key={f.label} className="rounded-lg bg-sunken px-3.5 py-3">
              <div className="text-label text-muted-foreground">{f.label}</div>
              <div className="num mt-1 truncate text-money-lg">{formatMoney(f.value)}</div>
            </div>
          ))}
        </div>
      )}

      {sentence && (
        <p className="mt-5 border-t border-border pt-3.5 text-body text-muted-foreground">
          {sentence}
        </p>
      )}
      {children}
    </Card>
  );
}

/** Hàng dẫn sang chỗ khác: icon + nhãn + con số + mũi tên. Bấm cả hàng. */
export function LinkRow({
  href,
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "primary" | "income" | "expense" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary-surface text-primary",
    income: "bg-income-surface text-income",
    expense: "bg-expense-surface text-expense",
    warning: "bg-warning-surface text-warning",
  }[tone];

  return (
    <Link
      href={href}
      className={rowClass({ container: "card" })}
    >
      <span
        className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg", toneClass)}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-body text-muted-foreground">{label}</div>
        <div className="num truncate text-money-row">{value}</div>
      </div>
      <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Khối nội dung có tiêu đề + hành động phụ ở góc phải. */
export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3.5 pt-4.5">
        {/* Tiêu đề mục là chữ thường 15px, phân biệt bằng độ đậm và màu —
            không phải 11px viết hoa giãn chữ như bản cũ. */}
        <h2 className="text-label text-muted-foreground">{title}</h2>
        {action}
      </div>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/** Ô trống trong một khối nội dung. */
export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <EmptyState size="inline">{children}</EmptyState>;
}

/** Dùng cho các chỗ cần biểu tượng "cân bằng" nhất quán. */
export const BalanceIcon = Scale;
