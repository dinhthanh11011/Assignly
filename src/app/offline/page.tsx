import { WifiOff } from "lucide-react";

export const metadata = { title: "Ngoại tuyến" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-xl bg-muted">
        <WifiOff className="size-8 text-muted-foreground" />
      </div>
      <h1 className="text-page font-semibold">Bạn đang ngoại tuyến</h1>
      <p className="max-w-sm text-muted-foreground">
        Ứng dụng cần kết nối mạng để tải dữ liệu mới nhất. Hãy kết nối lại rồi thử lại.
      </p>
    </main>
  );
}
