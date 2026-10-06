import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  NotebookPen,
  Plus,
  Scale,
} from "lucide-react";
import { CreateGroupButton, JoinGroupButton } from "@/components/group-dialogs";
import { Card } from "@/components/ui/card";
import { Amount } from "@/components/ui/amount";
import { EmptyState } from "@/components/ui/empty-state";
import { moneyRowClass, rowLeadClass, rowTextClass } from "@/components/ui/row";
import { cn, formatMoney } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Khung dùng chung của các trang trong app.

   Bố cục thông tin (thanh dưới / thanh bên):
     `/`          Tổng quan — tình hình tháng này + việc cần làm
     `/ledger`    Sổ — ghi và xem lại từng khoản (danh sách / lịch)
     `/loans`     Nợ — cho mượn, đi mượn, cân đối chi chung
     `/reports`   Báo cáo — xu hướng theo khoảng thời gian
     `/settings`  Cài đặt — sổ & thành viên, loại thu chi, hiển thị, tài khoản
                  (mở từ thanh trên; `/groups`, `/categories` là trang con)

   Mọi cỡ chữ đi qua thang text-* (co theo cỡ chữ người dùng chọn); mọi số
   tiền có dấu/nhãn chứ không chỉ màu; mọi thứ bấm được ≥44px.
   ──────────────────────────────────────────────────────────────────────────── */

/** Ô biểu tượng của app: emerald đặc + cuốn sổ. Dùng ở màn chào mừng/đăng nhập. */
export function AppMark({ size = "lg", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary text-primary-foreground",
        size === "lg" ? "size-16 rounded-2xl" : "size-10 rounded-xl",
        className
      )}
    >
      <NotebookPen className={size === "lg" ? "size-8" : "size-5"} />
    </span>
  );
}

/**
 * Màn chào mừng khi người dùng chưa thuộc sổ nào — mọi trang dữ liệu cần một sổ.
 *
 * Hai thẻ lựa chọn MỞ THẲNG hộp thoại (không vòng qua `/groups`). Tạo xong thì
 * về `/` — Tổng quan của sổ mới, nơi có lời mời ghi khoản đầu tiên.
 */
export function NoGroupState() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center py-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <AppMark className="mx-auto" />
          <h1 className="mt-5 text-page">Chào mừng đến Sổ Thu Chi</h1>
          <p className="mx-auto mt-2 max-w-sm text-body text-muted-foreground">
            Mỗi sổ là một nơi ghi tiền vào, tiền ra và các khoản cho mượn. Dùng một mình, hoặc ghi
            chung với người thân.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3">
          <CreateGroupButton
            redirectTo="/"
            trigger={
              <ChoiceCard
                icon={Plus}
                title="Tạo sổ mới"
                text="Bắt đầu sổ của riêng bạn, có sẵn các loại thu chi thông dụng."
                primary
              />
            }
          />
          <JoinGroupButton
            trigger={
              <ChoiceCard
                icon={KeyRound}
                title="Vào sổ bằng mã"
                text="Có người đã mời bạn? Nhập mã 8 ký tự họ gửi."
              />
            }
          />
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/groups"
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-label text-muted-foreground transition-colors hover:text-foreground"
          >
            Xem các sổ và yêu cầu đã gửi <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Thẻ lựa chọn lớn — là <button> để làm trigger của Dialog. */
function ChoiceCard({
  icon: Icon,
  title,
  text,
  primary,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ElementType;
  title: string;
  text: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "focus-ring group flex w-full cursor-pointer items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors duration-150 hover:bg-sunken",
        primary ? "border-primary" : "border-border"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          primary ? "bg-primary text-primary-foreground" : "bg-primary-surface text-primary"
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-lg font-semibold">{title}</span>
        <span className="mt-0.5 block text-caption text-muted-foreground">{text}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

/**
 * Màn một-thông-báo chiếm trọn khung: lỗi, không tìm thấy, ngoại tuyến, lời mời.
 *
 * Tiếng Việt, giữ theme + cỡ chữ, luôn có một hành động tiếp theo — thay cho
 * trang lỗi tiếng Anh mặc định của Next.
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
  /** `muted` "không có gì ở đây" · `expense` "có gì đó hỏng" · `warning` "cần chú ý" · `primary` lời mời/tích cực. */
  tone?: "muted" | "expense" | "primary" | "warning";
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Dòng nhỏ cuối cùng — dùng cho mã lỗi. */
  footnote?: React.ReactNode;
  /** Màn ở ngoài (app)/layout thì truyền min-h-dvh: chúng không có <main> bao. */
  className?: string;
}) {
  const halo = {
    muted: "bg-sunken",
    expense: "bg-expense-surface",
    warning: "bg-warning-surface",
    primary: "bg-primary-surface",
  }[tone];
  const ink = {
    muted: "text-muted-foreground",
    expense: "text-expense",
    warning: "text-warning",
    primary: "text-primary",
  }[tone];
  return (
    <div
      className={cn(
        "flex min-h-[70dvh] flex-col items-center justify-center px-4 py-10",
        className
      )}
    >
      <div className="w-full max-w-sm text-center">
        {/* Hai vòng đồng tâm mờ quanh ô icon: minh hoạ nhẹ, thuần trang trí. */}
        <div aria-hidden className="relative mx-auto mb-7 flex size-28 items-center justify-center">
          <span className={cn("absolute inset-0 rounded-full opacity-50", halo)} />
          <span className={cn("absolute inset-3 rounded-full", halo)} />
          <span className="relative flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
            <Icon className={cn("size-8", ink)} />
          </span>
        </div>
        <h1 className="text-page text-balance">{title}</h1>
        <div className="mt-2.5 text-body text-pretty text-muted-foreground">{children}</div>
        {actions && <div className="mt-8 flex flex-col gap-2.5">{actions}</div>}
        {footnote && <p className="mt-6 text-caption text-muted-foreground">{footnote}</p>}
      </div>
    </div>
  );
}

/**
 * Hàng "quay lại" ở đầu các trang con.
 *
 * <Link> có đích cứng chứ KHÔNG phải router.back(): `/groups/[id]` là đích của
 * thông báo đẩy nên hay được mở nguội — lịch sử rỗng thì back() không đi đâu.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="focus-ring -ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg pl-1 pr-3 text-label text-muted-foreground transition-colors duration-150 hover:bg-sunken hover:text-foreground"
    >
      <ChevronLeft className="size-5" aria-hidden /> {label}
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
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-[1_1_14rem]">
        <h1 className="text-page text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-body text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * Thẻ số dư lớn của một khoảng thời gian (trang Báo cáo): còn lại · thanh tỉ
 * lệ vào/ra · hai ô số. Số dư dùng <Amount> nên luôn có dấu +/−.
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
    <section className="money-cq overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-5 md:p-6">
        <p className="text-label text-muted-foreground">{label}</p>
        <Amount value={balance} size="hero" className="mt-1.5" />
        <p className="mt-1.5 text-body text-muted-foreground">
          {positive ? "Còn dư sau khi trừ tiền ra" : "Tiền ra nhiều hơn tiền vào"}
        </p>

        {/* Thanh tỉ lệ có aria-label đọc ra cả hai con số. */}
        <div
          role="img"
          aria-label={`Tiền vào ${formatMoney(income)}, tiền ra ${formatMoney(expense)}`}
          className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        >
          <span className="h-full rounded-full bg-income" style={{ width: `${inShare}%` }} />
          <span className="h-full flex-1 rounded-full bg-expense" />
        </div>
      </div>

      {/* Thẻ là container (.money-cq): hẹp thì hai ô xuống một cột chứ không bóp số. */}
      <div className="grid grid-cols-1 border-t border-border @min-[22em]:grid-cols-2">
        <HeroFigure label="Tiền vào" value={income} tone="income" />
        <HeroFigure
          label="Tiền ra"
          value={expense}
          tone="expense"
          className="border-t border-border @min-[22em]:border-l @min-[22em]:border-t-0"
        />
      </div>

      {footer && <div className="border-t border-border px-5 py-3.5 text-body md:px-6">{footer}</div>}
    </section>
  );
}

function HeroFigure({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  className?: string;
}) {
  const Icon = tone === "income" ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className={cn("min-w-0 px-5 py-4 md:px-6", className)}>
      <div className="flex items-center gap-2 text-label text-muted-foreground">
        <span
          aria-hidden
          className={cn(
            "flex size-6 items-center justify-center rounded-md",
            tone === "income" ? "bg-income-surface text-income" : "bg-expense-surface text-expense"
          )}
        >
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      <Amount value={tone === "income" ? value : -value} tone={tone} size="lg" className="mt-1.5" />
    </div>
  );
}

const TILE_TONES = {
  primary: "bg-primary-surface text-primary",
  income: "bg-income-surface text-income",
  expense: "bg-expense-surface text-expense",
  warning: "bg-warning-surface text-warning",
} as const;

/** Ô số liệu: nhãn có icon ở trên, con số lớn ở dưới. Không bấm được. */
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
  tone?: keyof typeof TILE_TONES;
  hint?: string;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-2 p-4">
      <div className="flex items-center gap-2.5 text-label text-muted-foreground">
        <span
          aria-hidden
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TILE_TONES[tone])}
        >
          <Icon className="size-4.5" />
        </span>
        <span className="min-w-0">{label}</span>
      </div>
      {/* Không cắt con số — một con số cắt dở không còn là con số. */}
      <div className="num text-money-lg break-words">{value}</div>
      {hint && <div className="text-caption text-muted-foreground">{hint}</div>}
    </Card>
  );
}

/**
 * Thẻ tóm tắt: một câu, một con số lớn, và (tuỳ chọn) vài ô số phụ. Chiều của
 * tiền do NHÃN nói ("Người ta còn nợ bạn"), màu chỉ nhấn thêm.
 */
export function SummaryCard({
  label,
  amount,
  tone = "neutral",
  sentence,
  figures,
  children,
}: {
  label: string;
  amount: number;
  tone?: "income" | "expense" | "neutral";
  sentence?: string;
  figures?: { label: string; value: number }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="money-cq overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-5 md:p-6">
        <p className="text-label text-muted-foreground">{label}</p>
        <Amount value={amount} tone={tone} signed={false} size="hero" className="mt-1.5" />
      </div>

      {figures && figures.length > 0 && (
        <div className="grid grid-cols-1 border-t border-border @min-[22em]:grid-cols-2">
          {figures.map((f, i) => (
            <div
              key={f.label}
              className={cn(
                "min-w-0 px-5 py-4 md:px-6",
                i > 0 && "border-t border-border @min-[22em]:border-t-0",
                i % 2 === 1 && "@min-[22em]:border-l"
              )}
            >
              <div className="text-label text-muted-foreground">{f.label}</div>
              <div className="num mt-1 text-money-lg">{formatMoney(f.value)}</div>
            </div>
          ))}
        </div>
      )}

      {(sentence || children) && (
        <div className="border-t border-border px-5 py-4 md:px-6">
          {sentence && <p className="text-body text-muted-foreground">{sentence}</p>}
          {children}
        </div>
      )}
    </section>
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
  tone?: keyof typeof TILE_TONES;
}) {
  return (
    <Link href={href} className={cn(moneyRowClass({ container: "card" }), "duration-150")}>
      <span className={rowLeadClass}>
        <span
          aria-hidden
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", TILE_TONES[tone])}
        >
          <Icon className="size-5" />
        </span>
        <span className={rowTextClass}>
          <span className="block text-label text-muted-foreground">{label}</span>
          {/* Không cắt con số — hàng xuống dòng thay (xem moneyRowClass). */}
          <span className="num block text-money-row">{value}</span>
        </span>
      </span>
      <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

/** Khối nội dung có tiêu đề + hành động phụ ở góc phải. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title: string;
  /** Một câu dưới tiêu đề. */
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Neo để link tới thẳng khối này (vd. `#join-requests`). */
  id?: string;
}) {
  return (
    <Card id={id} className={className}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pb-3 pt-4.5">
        <div className="min-w-0 flex-[1_1_12rem]">
          <h2 className="text-body-lg font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </Card>
  );
}

/** Ô trống trong một khối nội dung. */
export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <EmptyState size="inline">{children}</EmptyState>;
}

/** Dùng cho các chỗ cần biểu tượng "cân bằng" nhất quán. */
export const BalanceIcon = Scale;
