import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminUser, isSiteAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { RouteProgress } from "@/components/nav-progress";

export const metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị" },
};

/**
 * Khung của khu quản trị — và là chốt chuyển hướng của toàn bộ /admin.
 *
 * Không phải ranh giới quyền: layout không chạy lại khi điều hướng phía client,
 * nên mọi query (`admin-queries.ts`) và mọi action (`admin-actions.ts`) tự gọi
 * `requireAdmin()`. Proxy không làm được việc này vì nó cố ý không import Prisma.
 *
 * Nằm ngoài route group `(app)` nên không có thanh nav, bộ chọn sổ, nút ghi nổi
 * của app — chỉ thừa hưởng `src/app/layout.tsx` gốc (font, theme, Providers).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin");

  // Về "/" chứ không 404: người đã đăng nhập gõ nhầm /admin nên về chỗ dùng được.
  if (!(await isSiteAdmin(session.user.id))) redirect("/");
  const me = await getAdminUser(session.user.id);

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <RouteProgress />
      <AdminNav user={{ name: me?.name ?? null, email: me?.email ?? null }} />
      {/* @container/admin: lưới đổi cột theo bề rộng VÙNG NỘI DUNG, không theo
          cửa sổ — thanh bên 16rem làm hai con số đó lệch nhau. */}
      <main className="@container/admin mx-auto w-full min-w-0 max-w-[96rem] flex-1 space-y-6 px-4 pb-16 pt-5 md:px-6 lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
