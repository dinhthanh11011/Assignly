import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

export const metadata = { title: "Không có trang này" };

/**
 * 404 cho đường dẫn không khớp route nào. Nằm ngoài `(app)/layout.tsx` nên tự
 * dựng <main> và chiếm trọn chiều cao. Người chưa đăng nhập hầu như không thấy
 * màn này: `src/proxy.ts` đẩy đường dẫn lạ về `/signin` trước.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <MessageScreen
        icon={SearchX}
        title="Không có trang này"
        className="min-h-dvh"
        actions={
          <Button asChild size="lg">
            <Link href="/">Về Tổng quan</Link>
          </Button>
        }
        footnote="Mở từ một link cũ? Link có thể đã đổi sau khi được gửi đi."
      >
        Đường dẫn bạn vừa mở không tồn tại hoặc đã đổi tên.
      </MessageScreen>
    </main>
  );
}
