"use client";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Hệ màu thiết kế cho nền tối trước, nên mặc định là tối; ai đặt theme
          sáng trong máy vẫn được tôn trọng qua enableSystem + nút chuyển. */}
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        <Toaster
          richColors
          position="top-center"
          toastOptions={{ style: { borderRadius: "1rem" } }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
