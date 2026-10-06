"use client";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Màn lỗi của khu quản trị. Người đọc là người vận hành nên ưu tiên chỗ hỏng
 * và digest hơn lời trấn an; nằm trong khung admin chứ không chiếm cả màn.
 * `retry` (Next 16.3) tải lại dữ liệu rồi vẽ lại.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-expense-surface text-expense"
      >
        <TriangleAlert className="size-5" />
      </span>
      <div className="min-w-0 flex-[1_1_16rem] space-y-3">
        <div>
          <h1 className="text-title">Trang quản trị này bị lỗi</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Thường là một truy vấn thống kê hỏng. Dữ liệu của người dùng không bị ảnh hưởng.
          </p>
          {error.digest && (
            <p className="mt-1 text-caption text-muted-foreground">
              Mã lỗi: <span className="num">{error.digest}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => retry()}>
            <RotateCw /> Thử lại
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">Về trang quản trị</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
