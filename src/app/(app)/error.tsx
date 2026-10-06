"use client";
import { useEffect } from "react";
import Link from "next/link";
import { CloudOff, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

/**
 * Màn lỗi cho khung app.
 *
 * `retry()` (ổn định từ Next 16.3; bản 16.3 KHÔNG còn truyền `unstable_retry`)
 * tải lại dữ liệu rồi vẽ lại — khác `reset()` chỉ vẽ lại mà không tải, nên với
 * lỗi truy vấn CSDL bấm `reset()` chỉ ra lại đúng màn lỗi này.
 *
 * Ranh giới này không bắt lỗi của `(app)/layout.tsx` cùng cấp — chỉ
 * `global-error.tsx` bắt được.
 */
export default function AppError({
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
    <MessageScreen
      icon={CloudOff}
      tone="expense"
      title="Chưa tải được trang này"
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            <RotateCw /> Thử lại
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Về trang Ghi chép</Link>
          </Button>
        </>
      }
      // Bản chạy thật chỉ để lại digest — đầu mối duy nhất để đọc cho người hỗ trợ.
      footnote={error.digest && `Mã lỗi: ${error.digest}`}
    >
      Thường là do mạng chập chờn. Không có khoản nào bị mất — bạn thử lại nhé.
    </MessageScreen>
  );
}
