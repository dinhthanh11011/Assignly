import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUnreadNotifications } from "@/lib/queries";
import { AppNav } from "@/components/app-nav";
import { TopBar } from "@/components/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const notifications = await getUnreadNotifications(session.user.id);

  return (
    <div className="flex min-h-dvh flex-1">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <TopBar user={session.user} notifications={notifications} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
