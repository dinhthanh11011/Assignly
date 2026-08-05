import Link from "next/link";
import { ArrowLeftRight, ChevronRight, HandCoins, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getMyGroups } from "@/lib/queries";
import { AvatarStack } from "@/components/member-avatar";
import { CreateGroupButton, JoinGroupButton } from "@/components/group-dialogs";
import { PageHeader } from "@/components/page-shell";

export const metadata = { title: "Sổ chung" };

export default async function GroupsPage() {
  const session = await auth();
  const groups = await getMyGroups(session!.user.id);

  return (
    <div className="space-y-5">
      <PageHeader title="Sổ chung" subtitle="Ghi riêng hoặc ghi chung với người thân">
        <JoinGroupButton />
        <CreateGroupButton />
      </PageHeader>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <p className="text-3xl">📒</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa có sổ nào. Tạo sổ mới hoặc tham gia bằng mã mời.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="group flex items-center gap-4 rounded-xl border border-hairline bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
            >
              <span className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-md text-base font-bold text-white">
                {g.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold group-hover:text-primary">{g.name}</h3>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> {g._count.members}
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowLeftRight className="size-3.5" /> {g._count.transactions} giao dịch
                  </span>
                  <span className="flex items-center gap-1">
                    <HandCoins className="size-3.5" /> {g._count.loans} khoản vay
                  </span>
                </div>
              </div>
              <AvatarStack users={g.members.map((m) => m.user)} max={3} />
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
