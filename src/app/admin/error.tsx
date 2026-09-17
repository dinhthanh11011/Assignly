"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Màn lỗi của khu quản trị.
 *
 * Không dùng `MessageScreen` như `(app)/error.tsx`: nó căn giữa theo chiều cao
 * màn hình và nói giọng trấn an người dùng cuối ("không có khoản nào bị mất").
 * Ở đây người đọc là người vận hành app — họ cần biết hỏng ở đâu, nên thông báo
 * và digest được ưu tiên hơn sự dịu dàng.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h1 className="text-title text-destructive">Trang quản trị này lỗi</h1>
      <p className="text-body text-muted-foreground">
        Thường là một truy vấn thống kê hỏng. Dữ liệu của app không bị ảnh hưởng.
      </p>
      {error.digest && <p className="text-caption text-muted-foreground">Mã lỗi: {error.digest}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => unstable_retry()}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/admin">Về Tổng quan</Link>
        </Button>
      </div>
    </div>
  );
}
