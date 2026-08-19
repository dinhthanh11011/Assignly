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
  // Khoá tỉ lệ ở 1× theo yêu cầu, để iOS không tự phóng to trang khi focus vào
  // ô nhập. ĐỌC KỸ TRƯỚC KHI GIỮ LẠI DÒNG maximumScale:
  //
  //  · Nó KHÔNG còn cần thiết nữa. Nguyên nhân thật của lỗi đó là tailwind-merge
  //    nuốt mất class `text-field` — đã sửa ở lib/utils.ts. Sàn 16px một mình
  //    là đủ để Safari thôi phóng to.
  //  · Cái giá: trên iOS Safari (tab thường) người dùng vẫn pinch-zoom được vì
  //    Safari ≥10 cố tình bỏ qua giới hạn này với thao tác tay người — NHƯNG
  //    trong PWA đã cài ra màn hình chính (app này có appleWebApp.capable) và
  //    trên Android Chrome thì zoom hai ngón MẤT HẲN. Đó là lỗi WCAG 1.4.4, và
  //    với một app sổ thu chi cho người lớn tuổi thì đó là bỏ mất lối phóng to
  //    cuối cùng của họ — cần gạt cỡ chữ nhỏ/vừa/lớn chỉ tác động lên chữ, không
  //    lên biểu đồ hay ô lịch.
  //
  // Bỏ khoá = xoá đúng dòng maximumScale bên dưới. userScalable: true giữ nguyên.
  maximumScale: 1,
  userScalable: true,
  viewportFit: "cover",
  // resizes-VISUAL (mặc định của spec), KHÔNG phải resizes-content.
  //
  // resizes-content nhờ trình duyệt tự co layout viewport khi bàn phím mở, và
  // nó chỉ có ở Chrome Android — iOS bỏ qua hoàn toàn, nên bottom sheet vẫn bị
  // bàn phím phủ mất đáy ở đúng nơi người dùng gõ nhiều nhất. Tệ hơn, trên
  // Android nó bù HAI LẦN cho cùng một việc (co trang + tự cuộn tới ô nhập), và
  // đó là dải trống hiện ra dưới sheet sau khi bàn phím đẩy giao diện lên.
  //
  // Nay chiều cao bàn phím được ĐO qua visualViewport rồi đưa vào --kb/--vvh
  // (xem components/viewport-insets.tsx), và ui/dialog.tsx dựng hình học sheet
  // từ hai biến đó — một đường đi duy nhất cho cả hai hệ.
  interactiveWidget: "resizes-visual",
};

/* Áp cỡ chữ đã chọn TRƯỚC khi paint để không nháy một nhịp cỡ sai.
   Cùng lối làm với next-themes.

   Lọc theo danh sách trắng thay vì nối thẳng 'fs-'+s: localStorage sống lâu hơn
   code, nên nó còn giữ những mức đã bị bỏ ('xl' của thang bốn mức trước, 'sm' của
   một lượt giữa) và nối thẳng thì thêm một class không còn định nghĩa nào — trông
   như bình thường nhưng lệch với thứ font-size-control đọc lại từ DOM. */
const FONT_SCALE_SCRIPT = `try{var s=localStorage.getItem('fs');if(s==='md'||s==='lg')document.documentElement.classList.add('fs-'+s)}catch(e){}`;

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
