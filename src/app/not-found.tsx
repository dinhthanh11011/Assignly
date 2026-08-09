import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

export const metadata = { title: "Không có trang này" };

/**
 * 404 cho mọi đường dẫn không khớp route nào.
 *
 * Nằm ngoài `(app)/layout.tsx` nên không có `<main>` bao và không có thanh điều
 * hướng — phải tự chiếm chiều cao như `offline/page.tsx`.
 *
 * Thực tế người chưa đăng nhập hầu như không thấy màn này: `src/proxy.ts` đẩy
 * mọi đường dẫn lạ về `/signin?callbackUrl=…` trước. Nó dành cho người đã đăng
 * nhập gõ nhầm hoặc mở một link cũ.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <MessageScreen
        icon={Compass}
        title="Không có trang này"
        className="min-h-dvh"
        actions={
          <Button asChild size="lg">
            <Link href="/">Về trang chính</Link>
          </Button>
        }
      >
        Đường dẫn bạn vừa mở không tồn tại, hoặc đã đổi tên. Về trang chính rồi tìm lại nhé.
      </MessageScreen>
    </main>
  );
}
