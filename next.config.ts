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
};

export default nextConfig;
