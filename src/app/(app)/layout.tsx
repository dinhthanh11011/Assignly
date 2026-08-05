import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getNotifications, getUnreadNotificationCount } from "@/lib/queries";
import { AppNav } from "@/components/app-nav";
import { NotificationBell } from "@/components/notification-bell";
import { QuickAddFab } from "@/components/quick-add-fab";
import { TopBar } from "@/components/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  return (
    <div className="flex min-h-dvh flex-1">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col md:pl-[248px]">
        <TopBar
          user={session.user}
          bell={
            // Chuông không được giữ cả khung app lại: hiện ngay bản rỗng rồi tự
            // thay bằng dữ liệu thật khi truy vấn thông báo xong.
            <Suspense
              fallback={<NotificationBell notifications={[]} nextCursor={null} unreadCount={0} />}
            >
              <Bell userId={session.user.id} />
            </Suspense>
          }
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 md:px-7 md:pb-12 md:pt-7">
          {children}
        </main>
      </div>
      {/* Không giữ trang lại chờ truy vấn sổ/danh mục: FAB stream vào sau */}
      <Suspense>
        <QuickAddFab userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function Bell({ userId }: { userId: string }) {
  const [{ items, nextCursor }, unreadCount] = await Promise.all([
    getNotifications(userId),
    getUnreadNotificationCount(userId),
  ]);
  return (
    <NotificationBell notifications={items} nextCursor={nextCursor} unreadCount={unreadCount} />
  );
}
