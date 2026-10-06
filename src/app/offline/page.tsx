import { WifiOff } from "lucide-react";
import { MessageScreen } from "@/components/page-shell";
import { RetryButton } from "./retry-button";

export const metadata = { title: "Mất mạng" };

/** Service worker trả trang này khi không tải được trang nào khác. */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col">
      <MessageScreen
        icon={WifiOff}
        title="Đang không có mạng"
        className="min-h-dvh"
        actions={<RetryButton />}
        footnote="Khoản bạn ghi lúc mất mạng được giữ trên máy và tự gửi đi khi có mạng lại."
      >
        Trang này cần mạng để tải dữ liệu mới nhất của sổ. Bật Wi-Fi hoặc dữ liệu di động rồi thử
        lại.
      </MessageScreen>
    </main>
  );
}
