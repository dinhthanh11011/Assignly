import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

/* Font chính: thiết kế riêng cho tiếng Việt. Geist (bản cũ) không có subset
   "vietnamese" — latin-ext phủ đủ CODEPOINT nhưng không phủ THIẾT KẾ: dấu được
   xếp máy móc, không kern, không đặt lại vị trí theo từng ký tự ghép, nên "ế"
   "ộ" "ữ" bị đâm nhau. Nâng cỡ chữ làm lỗi đó rõ hơn chứ không nhẹ đi.
   Be Vietnam Pro vẽ và đặt lại vị trí dấu cho từng ký tự — đó là lý do nó tồn
   tại. Nó cũng phân biệt rõ 1/l/I và 0/O, chuyện quan trọng khi đọc số tiền. */
const sans = Be_Vietnam_Pro({
  variable: "--font-sans-vn",
  subsets: ["vietnamese", "latin"],
  // Không phải variable font trên Google Fonts → pin đúng 4 weight bậc chữ dùng.
  weight: ["400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
});

/* Chỉ dùng cho cột số nhiều dòng (báo cáo, danh sách quyết toán). Chữ số thuần
   Latin nên khoảng trống tiếng Việt không liên quan. Số tiền thường KHÔNG dùng
   mono nữa — canh cột do tabular-nums lo, không cần mặt chữ máy đánh chữ. */
const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const APP_NAME = "Sổ Thu Chi";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Ghi thu chi, cho mượn & đòi nợ`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Ghi chép thu chi hằng ngày, theo dõi tiền cho mượn, nhắc tới hẹn trả và xem lại mấy tháng qua tiêu vào việc gì — dùng riêng hoặc ghi chung cả nhà.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
};

export const viewport: Viewport = {
  // Phải khớp --background của globals.css, nếu không thanh trạng thái trên
  // Android và vùng an toàn của PWA lệch tông so với đầu trang.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1015" },
  ],
  width: "device-width",
  initialScale: 1,
  // KHÔNG đặt maximumScale/userScalable=no. Bản cũ khoá zoom hai ngón, mà app
  // này để người lớn tuổi dùng — khoá zoom là bỏ mất lối thoát cuối cùng của
  // họ, và là lỗi WCAG 1.4.4 thẳng thừng.
  userScalable: true,
  viewportFit: "cover",
  // Bàn phím ảo co lại vùng nhìn thấy → dvh trong bottom sheet tính đúng.
  interactiveWidget: "resizes-content",
};

/* Áp cỡ chữ đã chọn TRƯỚC khi paint để không nháy một nhịp cỡ sai.
   Cùng lối làm với next-themes. */
const FONT_SCALE_SCRIPT = `try{var s=localStorage.getItem('fs');if(s&&s!=='1')document.documentElement.classList.add('fs-'+s)}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FONT_SCALE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
