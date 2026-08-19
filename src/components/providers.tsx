"use client";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ViewportInsets } from "@/components/viewport-insets";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Mặc định NỀN SÁNG. Chữ đen trên nền sáng đọc tốt hơn có đo được, và
          khoảng cách đó tăng theo tuổi: nền sáng làm co đồng tử, tăng chiều sâu
          trường ảnh, bù đúng phần điều tiết mà mắt lão thị đã mất. Thêm nữa,
          chữ sáng trên nền tối bị loé (halation) trong mắt có độ đục thuỷ tinh
          thể, và loé nặng nhất ở nét mảnh tương phản cao — dấu thanh tiếng Việt
          đúng là nét mảnh tương phản cao.
          Nền tối vẫn đủ token và cùng chuẩn tương phản; enableSystem giữ lại để
          mục "Theo máy" chọn được, nhưng giá trị ban đầu là sáng. */}
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {/* Đo bàn phím ảo cho bottom sheet — xem ViewportInsets. Mount ở đây
            (một lần cho cả app) chứ không trong dialog: mốc "chiều cao khi chưa
            có bàn phím" phải được đo TRƯỚC lúc mở sheet mới đúng. */}
        <ViewportInsets />
        {children}
        <Toaster
          richColors
          position="top-center"
          // 4s mặc định quá ngắn với người đọc chậm.
          duration={5000}
          toastOptions={{ style: { borderRadius: "1rem", fontSize: "1rem" } }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
