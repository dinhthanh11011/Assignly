import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 bên trong khung quản trị — thường là một id người dùng hoặc id sổ đã bị
 * xoá, mở lại từ một tab cũ hoặc một đường dẫn ai đó gửi cho nhau.
 */
export default function AdminNotFound() {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h1 className="text-title">Không tìm thấy</h1>
      <p className="text-body text-muted-foreground">
        Người dùng hoặc sổ này không còn nữa — có thể đã bị xoá sau khi đường dẫn này được tạo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/admin">Về Tổng quan</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/users">Danh sách người dùng</Link>
        </Button>
      </div>
    </div>
  );
}
