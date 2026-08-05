import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  // Geist chưa có subset "vietnamese"; latin-ext đã phủ dấu tiếng Việt.
  subsets: ["latin", "latin-ext"],
});

// Dùng cho các con số tiền để chữ số luôn đều cột.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "Sổ Thu Chi";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Quản lý thu chi, cho vay & thu nợ`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Ghi chép thu chi hằng ngày, theo dõi các khoản cho vay, nhắc thu nợ và xem báo cáo dòng tiền — dùng riêng hoặc ghi chung cả nhà.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#131320" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Bàn phím ảo co lại vùng nhìn thấy → dvh trong bottom sheet tính đúng.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="app-bg min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
