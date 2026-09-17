import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị" },
};

/**
 * Khung của khu quản trị — và là CHỐT QUYỀN THẬT của toàn bộ /admin.
 *
 * `src/proxy.ts` đã buộc đăng nhập cho mọi đường dẫn ngoài `PUBLIC_PATHS`, nên
 * tới đây chắc chắn đã có phiên; việc còn lại là hỏi DB xem người này có phải
 * quản trị viên không. Không làm ở proxy được: proxy cố ý không import Prisma
 * (xem đầu `auth.config.ts`), và một claim `isAdmin` trong JWT sẽ ôi ngay khi
 * quyền đổi — xem `src/lib/admin.ts`.
 *
 * Lưu ý: chốt này KHÔNG bảo vệ server action. Mỗi action trong
 * `admin-actions.ts` tự gọi `requireAdmin()`, và đó mới là ranh giới của mọi
 * lượt ghi.
 *
 * Thư mục này nằm NGOÀI route group `(app)` nên không thừa hưởng khung
 * mobile-first ở đó (thanh nav bốn mục, bộ chọn sổ, nút ghi nổi) — chỉ thừa
 * hưởng `src/app/layout.tsx` gốc: font, theme, `Providers`.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin");

  // redirect("/") chứ không notFound(): trang 404 của app được viết cho khung
  // mobile và nói bằng giọng của sổ thu chi. Người đã đăng nhập gõ nhầm /admin
  // thì nên về chỗ dùng được, chứ không phải một màn cụt.
  if (!(await isSiteAdmin(session.user.id))) redirect("/");

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      <AdminNav />
      {/* @container/admin: các lưới ở `admin-shell.tsx` đổi số cột theo bề rộng
          của VÙNG NỘI DUNG, không phải của cửa sổ — sidebar 16rem làm hai con
          số đó lệch nhau đúng bằng chiều rộng sidebar. */}
      <main className="@container/admin min-w-0 flex-1 space-y-6 px-4 py-6 md:px-6">
        {children}
      </main>
    </div>
  );
}
