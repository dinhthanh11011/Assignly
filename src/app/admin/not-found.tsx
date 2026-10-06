import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 404 trong khung quản trị — thường là id người dùng / id sổ đã bị xoá, mở lại
 * từ tab cũ hoặc link ai đó gửi.
 */
export default function AdminNotFound() {
  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted-foreground"
      >
        <SearchX className="size-5" />
      </span>
      <div className="min-w-0 flex-[1_1_16rem] space-y-3">
        <div>
          <h1 className="text-title">Không tìm thấy</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Người dùng hoặc sổ này không còn nữa — có thể đã bị xoá sau khi link được tạo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin">Về trang quản trị</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/users">Danh sách người dùng</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
