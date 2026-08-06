import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { getNotifications, getScope, getUnreadNotificationCount } from "@/lib/queries";
import { AppNav } from "@/components/app-nav";
import { BookPicker } from "@/components/book-picker";
import { RouteProgress } from "@/components/nav-progress";
import { NotificationBell } from "@/components/notification-bell";
import { InstallPrompt } from "@/components/install-prompt";
import { PushPrompt } from "@/components/push-prompt";
import { QuickAddFab } from "@/components/quick-add-fab";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopBar } from "@/components/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin");

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Mọi trang đều động: thanh này là phản hồi tức thì cho mỗi lần chuyển
          trang / đổi bộ lọc, trong lúc chờ server trả dữ liệu mới. */}
      <RouteProgress />
      {/* Bộ chọn sổ sống ở KHUNG APP, không phải trong thân từng trang: nó vốn
          là cookie toàn cục nên mount lại ở mỗi header vừa thừa vừa khiến các
          trang trông giống hệt nhau. */}
      <Suspense fallback={<AppNav />}>
        <Chrome userId={session.user.id} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col md:pl-[268px]">
        <TopBar
          user={session.user}
          picker={
            <Suspense>
              <MobileBookPicker userId={session.user.id} />
            </Suspense>
          }
          // Không giữ trang lại chờ truy vấn sổ/loại: nút ghi stream vào sau.
          action={
            <Suspense>
              <QuickAddFab userId={session.user.id} />
            </Suspense>
          }
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
        {/* pb tính từ vùng an toàn dưới, không phải một số cố định: thanh nav
            nổi cao 4.25rem đặt cách mép 0.75rem và nút "Ghi" nhô lên tới
            5.15rem — tất cả đều nằm TRÊN safe-area-inset-bottom. Cộng env() vào
            đây thì hàng cuối của danh sách luôn cuộn hết ra khỏi gầm nav, kể cả
            trên máy có thanh cử chỉ dày. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-5 md:px-7 md:pb-12 md:pt-7">
          {children}
        </main>
      </div>
      {/* Các thanh mời (cài app, bật thông báo) xếp chồng trên thanh điều hướng dưới,
          không cái nào đè cái nào. `bottom` phải cùng công thức với pb của <main>:
          bản cũ để bottom-28 (7rem cố định) nên trên iPhone có thanh cử chỉ
          (env ≈ 2rem) nó tụt xuống đúng mép trên của thanh nav và đè lên. */}
      <div className="pointer-events-none fixed inset-x-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-50 flex flex-col gap-2 md:inset-x-auto md:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] md:right-6 md:w-sm">
        <InstallPrompt />
        <PushPrompt vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""} />
      </div>
    </div>
  );
}

/** Thanh bên + bộ chọn sổ. Tách ra để truy vấn sổ không giữ cả khung app lại. */
async function Chrome({ userId }: { userId: string }) {
  const { groups, groupId } = await getScope(userId);
  return (
    <AppNav
      picker={groupId ? <BookPicker groups={groups} current={groupId} /> : null}
      footer={<ThemeToggle />}
    />
  );
}

async function MobileBookPicker({ userId }: { userId: string }) {
  const { groups, groupId } = await getScope(userId);
  if (!groupId) return null;
  return <BookPicker groups={groups} current={groupId} className="h-12 w-full" />;
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
