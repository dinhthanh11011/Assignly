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
        {/* Panel hero đặt số dư mẫu lên trước: người dùng thấy ngay app trông thế nào */}
        <section className="hero-panel glass-edge relative overflow-hidden rounded-2xl p-6 text-white shadow-lift">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/12">
              <Wallet className="size-[18px]" />
            </span>
            <span className="text-[15px] font-bold tracking-tight">Sổ Thu Chi</span>
          </div>

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            Số dư tháng này
          </p>
          <p className="num-hero rise-in mt-1.5">12.450.000 ₫</p>

          <div className="mt-5 flex h-1.5 overflow-hidden rounded-full bg-white/12">
            <span className="h-full w-[62%] rounded-full bg-[oklch(0.86_0.17_152)]" />
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] font-bold uppercase tracking-wide text-white/55">
            <span>Vào 32,1tr</span>
            <span>Ra 19,7tr</span>
          </div>
        </section>

        <ul className="my-6 space-y-3">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-[13px]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <f.icon className="size-4" />
              </span>
              <span className="text-muted-foreground">{f.text}</span>
            </li>
          ))}
        </ul>

        <Suspense>
          <SignInButton />
        </Suspense>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Dữ liệu của bạn chỉ hiển thị cho thành viên trong sổ. 🔒
        </p>
      </div>
    </main>
  );
}
