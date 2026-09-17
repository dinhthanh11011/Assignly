import { cache } from "react";
import { prisma } from "@/lib/db";
import { getSession, requireUserId } from "@/lib/auth";

/**
 * Ai là quản trị viên **toàn hệ thống**.
 *
 * Đừng nhầm với `Role { OWNER, ADMIN, MEMBER }`: cái đó là quyền bên trong MỘT
 * sổ, và người quản lý một sổ không có quyền gì ở sổ khác. Đây là quyền trên
 * cả app — xem mọi người dùng, mọi sổ, mọi con số.
 *
 * Hai nguồn, hợp lại:
 *  · `ADMIN_EMAILS` trong env — luôn là admin, không gỡ được bằng UI. Đây là
 *    đường mở khoá: nếu ai đó lỡ gỡ quyền của admin cuối cùng thì vẫn còn lối vào.
 *  · Cột `User.isAdmin` — phong/gỡ ngay trong /admin.
 *
 * **Vì sao không nhét `isAdmin` vào JWT.** Nhìn qua thì hấp dẫn: `src/proxy.ts`
 * chỉ giải mã token (không cần DB) nên nó *đọc được* một claim như vậy, và ta
 * chặn được /admin ngay ở proxy. Nhưng claim đó ôi ngay khi quyền đổi: vừa phong
 * admin cho ai xong, token của họ vẫn ghi `isAdmin: false`, proxy đá họ ra khỏi
 * /admin trong khi DB nói họ LÀ admin — một cái cổng biết nói dối, và cách duy
 * nhất để chữa là bắt họ đăng xuất rồi đăng nhập lại. Đổi lại chỉ tiết kiệm được
 * một lần đọc một hàng theo khoá chính.
 *
 * Nên quyền được đọc tươi từ DB ở mỗi request, và `cache()` lo phần trùng lặp.
 */

/**
 * Đọc một lần lúc nạp module. Đổi `ADMIN_EMAILS` thì phải khởi động lại tiến
 * trình — đúng như mọi biến môi trường khác của app.
 */
const BOOTSTRAP_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/** Người này có admin "theo env" không — tức là cột `isAdmin` có tắt cũng vô ích. */
export function isBootstrapAdminEmail(email?: string | null) {
  return !!email && BOOTSTRAP_ADMIN_EMAILS.has(email.toLowerCase());
}

/** Còn ai vào được bằng env không, khi trong DB không còn admin nào. */
export function hasBootstrapAdmins() {
  return BOOTSTRAP_ADMIN_EMAILS.size > 0;
}

/**
 * Hồ sơ quản trị của một người. `cache()` để layout, page và hàng "Quản trị" ở
 * Cài đặt cùng hỏi vẫn chỉ tốn một query — y như `getScope` trong queries.ts.
 */
export const getAdminUser = cache((userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isAdmin: true,
      disabledAt: true,
    },
  }),
);

/** Tài khoản bị khoá thì mất sạch quyền, kể cả khi email nằm trong ADMIN_EMAILS. */
export async function isSiteAdmin(userId: string) {
  const u = await getAdminUser(userId);
  if (!u || u.disabledAt) return false;
  return u.isAdmin || isBootstrapAdminEmail(u.email);
}

/**
 * Chốt chặn cho MỌI server action trong `admin-actions.ts`.
 *
 * Layout không bảo vệ được server action — action là một endpoint riêng, gọi
 * thẳng được. Nên lần kiểm này không phải "phòng thủ nhiều lớp" cho yên tâm,
 * nó LÀ ranh giới duy nhất của mọi lượt ghi.
 */
export async function requireAdmin() {
  const userId = await requireUserId();
  if (!(await isSiteAdmin(userId))) throw new Error("Bạn không có quyền quản trị");
  return userId;
}

/** Bản không ném lỗi, cho /settings quyết định có hiện hàng "Quản trị" hay không. */
export async function isCurrentUserAdmin() {
  const session = await getSession();
  return session?.user?.id ? isSiteAdmin(session.user.id) : false;
}

/**
 * Ghi lại "vừa mở app", có tiết chế.
 *
 * Điều kiện nằm trong SQL (`updateMany` + `where`) nên không tốn thêm một lượt
 * đọc để hỏi "ghi chưa": nhiều nhất một lượt UPDATE có index mỗi 15 phút mỗi
 * người. Không `await` ở nơi gọi, và nuốt lỗi — trang không bao giờ được hỏng
 * hay chậm đi vì một con số thống kê.
 */
const SEEN_THROTTLE_MS = 15 * 60_000;

export function touchLastSeen(userId: string) {
  return prisma.user
    .updateMany({
      where: {
        id: userId,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - SEEN_THROTTLE_MS) } }],
      },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});
}
