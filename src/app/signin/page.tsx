import { Suspense } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  HandCoins,
  LockKeyhole,
  NotebookPen,
  PieChart,
  Users,
  Zap,
} from "lucide-react";
import { SignInButton } from "@/components/signin-button";
import { AppMark } from "@/components/page-shell";

export const metadata = { title: "Đăng nhập" };

const benefits = [
  { icon: Zap, title: "Ghi một khoản trong vài giây", text: "Loại hay dùng hiện sẵn, số tiền gợi ý sẵn." },
  { icon: HandCoins, title: "Không quên ai nợ ai", text: "Theo dõi cho mượn, đi mượn và nhắc khi tới hẹn." },
  { icon: Users, title: "Ghi chung với cả nhà", text: "Mời người thân vào cùng một sổ, tự cân đối chi chung." },
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  const sp = await searchParams;
  const disabled = sp.disabled === "1";

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10 md:px-8">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <div className="flex items-center gap-3">
            <AppMark size="md" />
            <span className="text-title">Sổ Thu Chi</span>
          </div>

          <h1 className="mt-8 text-page text-balance">
            Biết tiền mình đi đâu, mỗi ngày.
          </h1>
          <p className="mt-3 text-body-lg font-normal text-muted-foreground">
            Sổ thu chi cho gia đình: ghi nhanh, nhắc nợ đúng hẹn, xem lại tháng này tiêu vào việc
            gì.
          </p>

          {/* Tài khoản bị khoá ở /admin bị đẩy về đây — phải nói rõ, không thì họ
              bấm đăng nhập mãi và tưởng app hỏng. */}
          {disabled && (
            <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-border bg-warning-surface p-4">
              <LockKeyhole className="size-5 shrink-0 text-warning" aria-hidden />
              <div>
                <p className="text-body-lg text-warning">Tài khoản của bạn đang bị khoá</p>
                <p className="mt-1 text-body text-muted-foreground">
                  Sổ và các khoản đã ghi vẫn còn nguyên. Hãy liên hệ người quản trị để mở khoá.
                </p>
              </div>
            </div>
          )}

          <div className="mt-7">
            <Suspense>
              <SignInButton />
            </Suspense>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-caption text-muted-foreground lg:justify-start">
              <LockKeyhole className="size-4 shrink-0" aria-hidden />
              Dữ liệu chỉ hiện cho người trong cùng sổ.
            </p>
          </div>

          <ul className="mt-9 space-y-4">
            {benefits.map((b) => (
              <li key={b.title} className="flex gap-3.5">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-surface text-primary"
                >
                  <b.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-body font-semibold">{b.title}</span>
                  <span className="block text-caption text-muted-foreground">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Preview />
      </div>
    </main>
  );
}

/** Ảnh tĩnh của Tổng quan: thẻ số dư + một việc cần làm. Thuần minh hoạ. */
function Preview() {
  return (
    <figure aria-label="Hình minh hoạ trang Tổng quan" className="mx-auto w-full max-w-md lg:max-w-none">
      <div className="rounded-2xl border border-border bg-background p-3 sm:p-4">
        <div aria-hidden className="space-y-3">
          <div className="money-cq overflow-hidden rounded-xl border border-border bg-card">
            <div className="p-4">
              <p className="text-label text-muted-foreground">Còn lại · Tháng 10</p>
              <p className="num mt-1 text-money-lg text-income">+12.450.000 ₫</p>
              <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
                <span className="h-full w-[62%] rounded-full bg-income" />
                <span className="h-full flex-1 rounded-full bg-expense" />
              </div>
            </div>
            <div className="grid grid-cols-1 border-t border-border @min-[22em]:grid-cols-2">
              <div className="px-4 py-3">
                <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <ArrowDownLeft className="size-4 text-income" /> Tiền vào
                </p>
                <p className="num text-body font-semibold text-income">+32.150.000 ₫</p>
              </div>
              <div className="border-t border-border px-4 py-3 @min-[22em]:border-l @min-[22em]:border-t-0">
                <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <ArrowUpRight className="size-4 text-expense" /> Tiền ra
                </p>
                <p className="num text-body font-semibold text-expense">−19.700.000 ₫</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <p className="px-4 pt-3 text-label text-muted-foreground">Việc cần làm</p>
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-surface text-warning">
                <CalendarClock className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body">Anh Tuấn còn nợ bạn 2.000.000 ₫</span>
                <span className="block text-caption text-muted-foreground">Tới hẹn trả sau 3 ngày</span>
              </span>
            </div>
            <div className="flex items-center gap-3 border-t border-border px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-title leading-none">
                🍜
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">Ăn sáng</span>
                <span className="block text-caption text-muted-foreground">Hôm nay · Ăn uống</span>
              </span>
              <span className="num text-body font-semibold text-expense">−45.000 ₫</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 text-caption text-muted-foreground">
            <PieChart className="size-4" /> Ăn uống chiếm 38% chi tháng này
            <NotebookPen className="ml-auto size-4 text-primary" />
          </div>
        </div>
      </div>
    </figure>
  );
}
