import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

/** 404 chung trong khung app — giữ nguyên thanh điều hướng và cỡ chữ đã chọn. */
export default function AppNotFound() {
  return (
    <MessageScreen
      icon={Compass}
      title="Không tìm thấy trang này"
      actions={
        <Button asChild size="lg">
          <Link href="/">Về trang Ghi chép</Link>
        </Button>
      }
    >
      Trang bạn vừa mở không còn nữa, hoặc bạn không có quyền xem nó.
    </MessageScreen>
  );
}
