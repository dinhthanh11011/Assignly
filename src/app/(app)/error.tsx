"use client";
import { useEffect } from "react";
import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

/**
 * Màn lỗi cho toàn bộ khung app.
 *
 * Dùng `unstable_retry()` chứ không phải `reset()`: `reset()` chỉ vẽ lại phần
 * con mà KHÔNG tải lại dữ liệu, nên với lỗi đến từ truy vấn CSDL — gần như mọi
 * lỗi ở app này — bấm nó chỉ hiện lại đúng màn lỗi vừa rồi. Tài liệu của Next
 * 16.2 cũng nói thẳng nên dùng `unstable_retry`.
 *
 * Lưu ý phạm vi: ranh giới này KHÔNG bắt lỗi của `(app)/layout.tsx` cùng cấp —
 * chỉ `global-error.tsx` bắt được. Hiện layout đó không tải dữ liệu gì nên
 * không sao, nhưng nếu sau này có thì phải nhớ điều này.
 */
export default function AppError({
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
    <MessageScreen
      icon={CloudOff}
      tone="expense"
      title="Chỗ này đang trục trặc"
      actions={
        <>
          <Button size="lg" onClick={() => unstable_retry()}>
            Thử lại
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Về trang Ghi chép</Link>
          </Button>
        </>
      }
      // Ở bản chạy thật Next xoá nội dung thông báo lỗi đi, chỉ để lại digest —
      // nên đây là đầu mối DUY NHẤT người dùng đọc lại được cho người hỗ trợ.
      footnote={error.digest && `Mã lỗi: ${error.digest}`}
    >
      Không tải được dữ liệu của sổ. Thường là do mạng chập chờn. Bạn thử lại xem sao — không có
      khoản nào bị mất cả.
    </MessageScreen>
  );
}
