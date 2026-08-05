import { Suspense } from "react";
import { BarChart3, HandCoins, Users, Wallet } from "lucide-react";
import { SignInButton } from "@/components/signin-button";

const features = [
  { icon: Wallet, text: "Ghi thu chi hằng ngày trong vài giây" },
  { icon: HandCoins, text: "Theo dõi cho vay, đi vay và nhắc thu nợ" },
  { icon: BarChart3, text: "Báo cáo dòng tiền theo tháng và danh mục" },
  { icon: Users, text: "Ghi chung một sổ với gia đình, nhóm bạn" },
];

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="brand-gradient mx-auto mb-4 flex size-14 items-center justify-center rounded-xl shadow-lift">
            <Wallet className="size-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sổ<span className="text-primary"> Thu Chi</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Quản lý thu chi, cho vay và thu nợ ở một nơi.
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-lift">
          <ul className="mb-5 space-y-2.5">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-[13px]">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="size-4" />
                </span>
                <span className="text-muted-foreground">{f.text}</span>
              </li>
            ))}
          </ul>
          <Suspense>
            <SignInButton />
          </Suspense>
          <p className="mt-3.5 text-center text-[11px] text-muted-foreground">
            Dữ liệu của bạn chỉ hiển thị cho thành viên trong sổ. 🔒
          </p>
        </div>
      </div>
    </main>
  );
}
