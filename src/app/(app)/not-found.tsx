import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

/** 404 trong khung app — giữ thanh điều hướng và cỡ chữ đã chọn. */
export default function AppNotFound() {
  return (
    <MessageScreen
      icon={SearchX}
      title="Không tìm thấy trang này"
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/">Về Tổng quan</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/ledger">Mở sổ ghi chép</Link>
          </Button>
        </>
      }
    >
      Trang bạn vừa mở không còn nữa, đã đổi chỗ, hoặc bạn không có quyền xem.
    </MessageScreen>
  );
}
