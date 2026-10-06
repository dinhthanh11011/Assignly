import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Mọi trang đều động (dữ liệu riêng từng người) nên router phía client mặc
    // định không giữ cache: bấm lại đúng trang vừa xem vẫn phải chờ server.
    // Giữ 30s để quay lại / đổi qua đổi lại giữa các trang là hiện ngay; ghi
    // dữ liệu vẫn thấy mới ngay vì các action đều gọi revalidatePath.
    staleTimes: { dynamic: 30, static: 180 },
    // Turbopack nhớ kết quả biên dịch giữa các lần chạy `next dev`.
    turbopackFileSystemCacheForDev: true,
  },

  /**
   * Hai route đã được gộp đi, nhưng KHÔNG được xoá thẳng.
   *
   * Lý do bắt buộc: `payload.url` của Notification nằm vĩnh viễn trong DB
   * (xem actions.ts / join.ts), và `manifest.webmanifest` hard-code shortcut
   * cho màn hình chính. Những link đó sẽ còn trỏ tới đây mãi mãi, nên đường cũ
   * phải tiếp tục dẫn tới đúng nội dung mới.
   *
   *  · /transactions → trang sổ `/ledger`
   *  · /balance      → thành tab "Tiền chung" trong trang Nợ
   */
  async redirects() {
    return [
      { source: "/transactions", destination: "/ledger", permanent: true },
      // Trang sổ đã chuyển từ `/` sang `/ledger` khi `/` thành trang Tổng quan.
      // Link cũ mang tham số của sổ (`/?month=…`, `/?q=…`) vẫn phải mở đúng sổ;
      // query string được Next chuyển tiếp nguyên vẹn.
      ...["month", "type", "category", "q", "sap"].map((key) => ({
        source: "/",
        has: [{ type: "query" as const, key }],
        destination: "/ledger",
        permanent: false,
      })),
      { source: "/balance", destination: "/loans?view=shared", permanent: true },
    ];
  },
};

export default nextConfig;
