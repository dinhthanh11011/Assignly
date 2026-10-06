"use client";
import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";
import "./globals.css";

/**
 * Lưới an toàn cuối cùng: chỉ chạy khi chính `app/layout.tsx` hỏng, nên nó THAY
 * layout gốc và tự khai `<html>`/`<body>`. Hệ quả: không có font Be Vietnam Pro
 * (`next/font` không gọi được từ file client) và không có script cỡ chữ/theme —
 * màn này luôn ở cỡ gốc, nền sáng. Không export `metadata` được → dùng <title>.
 *
 * `retry` chứ không `unstable_retry`: Next 16.3 chỉ còn truyền `retry`.
 */
export default function GlobalError({
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
    <html lang="vi">
      <body
        className="min-h-dvh bg-background text-foreground antialiased"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        <title>Sự cố · Sổ Thu Chi</title>
        <main className="flex min-h-dvh flex-col">
          <MessageScreen
            icon={TriangleAlert}
            tone="expense"
            title="Ứng dụng gặp sự cố"
            className="min-h-dvh"
            actions={
              <Button size="lg" onClick={() => retry()}>
                <RotateCw /> Tải lại
              </Button>
            }
            footnote={error.digest && `Mã lỗi: ${error.digest}`}
          >
            Mọi khoản bạn đã ghi vẫn còn nguyên. Tải lại trang, nếu vẫn lỗi thì thử lại sau ít phút.
          </MessageScreen>
        </main>
      </body>
    </html>
  );
}
