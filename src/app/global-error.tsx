"use client";
import { useEffect } from "react";
import "./globals.css";

/**
 * Lưới an toàn cuối cùng: chỉ chạy khi chính `app/layout.tsx` hỏng, nên nó THAY
 * layout gốc và phải tự khai `<html>`/`<body>`.
 *
 * Hai hệ quả của việc thay layout gốc, cả hai đều chấp nhận được ở một màn gần
 * như không bao giờ hiện, nhưng phải biết:
 *  · Biến font Be Vietnam Pro được gắn ở layout gốc, mà `next/font` không gọi
 *    được từ file "use client" — nên ở đây chỉ còn font hệ thống.
 *  · Script áp cỡ chữ đã chọn cũng nằm ở layout gốc, nên màn này luôn ở cỡ gốc.
 *
 * Không export `metadata` được (Next cấm ở "use client") → dùng thẳng <title>.
 */
export default function GlobalError({
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
    <html lang="vi">
      <body
        className="min-h-dvh antialiased"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        <title>Sự cố · Sổ Thu Chi</title>
        <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <h1 className="text-page">Ứng dụng gặp sự cố</h1>
          <p className="mt-2.5 max-w-sm text-body text-muted-foreground">
            Hãy tải lại trang. Mọi khoản bạn đã ghi vẫn còn nguyên.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="focus-ring mt-7 min-h-12 rounded-lg bg-primary px-6 text-body font-semibold text-primary-foreground"
          >
            Tải lại
          </button>
          {error.digest && (
            <p className="mt-5 text-caption text-muted-foreground">Mã lỗi: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
