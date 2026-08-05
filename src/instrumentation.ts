/**
 * Mở sẵn pool kết nối tới database ngay khi server khởi động.
 *
 * Prisma chỉ mở kết nối khi có truy vấn, mà DB nằm ở xa (~70ms mỗi lượt) nên
 * bắt tay TCP+TLS cho từng kết nối rất đắt. Trang đầu tiên chạy 6–9 truy vấn
 * "song song" sẽ phải chờ mở lần lượt từng kết nối: đo được 517ms thay vì
 * 128ms khi pool đã ấm. Hâm nóng trước ở đây để người dùng không phải trả.
 *
 * Cố ý *không* await: server sẵn sàng nhận request ngay, các kết nối mở tiếp ở
 * chế độ nền (register() chạy xong mới tới lượt request đầu tiên).
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  void (async () => {
    try {
      const { prisma } = await import("@/lib/db");
      await Promise.all(
        Array.from({ length: 8 }, () => prisma.$queryRaw`SELECT 1`.catch(() => {}))
      );
    } catch {
      // Không có DB lúc khởi động thì cứ để request đầu tiên tự báo lỗi.
    }
  })();
}
