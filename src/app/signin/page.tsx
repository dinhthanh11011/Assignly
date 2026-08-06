import { Suspense } from "react";
import { ArrowDownCircle, ArrowUpCircle, BarChart3, HandCoins, Users, Wallet } from "lucide-react";
import { SignInButton } from "@/components/signin-button";
import { Card } from "@/components/ui/card";

const features = [
  { icon: Wallet, text: "Ghi tiền vào tiền ra hằng ngày trong vài giây" },
  { icon: HandCoins, text: "Theo dõi tiền cho mượn và nhắc khi tới hẹn trả" },
  { icon: BarChart3, text: "Xem lại mấy tháng qua tiêu vào những việc gì" },
  { icon: Users, text: "Ghi chung một sổ với gia đình, nhóm bạn" },
];

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* Số dư mẫu đặt lên trước: người dùng thấy ngay app trông thế nào. */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <Wallet className="size-5 text-primary-foreground" />
            </span>
            <span className="text-title">Sổ Thu Chi</span>
          </div>

          <p className="mt-7 text-label text-muted-foreground">Tháng này còn lại</p>
          <p className="num-hero mt-1.5 text-money-hero text-income">+12.450.000 ₫</p>
          <p className="mt-2 flex items-center gap-2 text-body-lg text-income">
            <ArrowDownCircle className="size-5" />
            Còn dư
          </p>

          <div
            role="img"
            aria-label="Tiền vào 32,1 triệu, tiền ra 19,7 triệu"
            className="mt-5 flex h-3 overflow-hidden rounded-full bg-expense"
          >
            <span className="h-full w-[62%] rounded-full bg-income" />
          </div>
          <div className="mt-2.5 flex justify-between text-label">
            <span className="flex items-center gap-1.5 text-income">
              <ArrowDownCircle className="size-4" /> Vào 32,1tr
            </span>
            <span className="flex items-center gap-1.5 text-expense">
              <ArrowUpCircle className="size-4" /> Ra 19,7tr
            </span>
          </div>
        </Card>

        <ul className="my-6 space-y-3">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-body">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-surface text-primary">
                <f.icon className="size-5" />
              </span>
              <span className="text-muted-foreground">{f.text}</span>
            </li>
          ))}
        </ul>

        <Suspense>
          <SignInButton />
        </Suspense>
        <p className="mt-4 text-center text-body text-muted-foreground">
          Dữ liệu của bạn chỉ hiện cho người trong sổ. 🔒
        </p>
      </div>
    </main>
  );
}
