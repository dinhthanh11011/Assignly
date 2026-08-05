import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNotifications, getUnreadNotificationCount } from "@/lib/queries";
import { AppNav } from "@/components/app-nav";
import { TopBar } from "@/components/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const [{ items, nextCursor }, unreadCount] = await Promise.all([
    getNotifications(session.user.id),
    getUnreadNotificationCount(session.user.id),
  ]);

  return (
    <div className="flex min-h-dvh flex-1">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col md:pl-[248px]">
        <TopBar
          user={session.user}
          notifications={items}
          nextCursor={nextCursor}
          unreadCount={unreadCount}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 md:px-7 md:pb-12 md:pt-7">
          {children}
        </main>
      </div>
    </div>
  );
}
