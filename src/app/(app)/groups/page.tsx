import Link from "next/link";
import { ArrowLeft, ChevronRight, Handshake, Notebook, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getMyGroups } from "@/lib/queries";
import { AvatarStack } from "@/components/member-avatar";
import { CreateGroupButton, JoinGroupButton } from "@/components/group-dialogs";
import { PageHeader } from "@/components/page-shell";

export const metadata = { title: "Sổ của tôi" };

export default async function GroupsPage() {
  const session = await getSession();
  const groups = await getMyGroups(session!.user.id);

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex min-h-12 items-center gap-2 text-body text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" /> Quay lại Cài đặt
      </Link>
      <PageHeader title="Sổ của tôi" subtitle="Ghi riêng một mình, hoặc ghi chung với người thân">
        <JoinGroupButton />
        <CreateGroupButton />
      </PageHeader>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <p className="text-page">📒</p>
          <p className="mt-3 text-body text-muted-foreground">
            Chưa có sổ nào. Tạo sổ mới, hoặc vào sổ của người khác bằng mã.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-sunken"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-body font-bold text-primary-foreground">
                {g.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-body-lg group-hover:text-primary">{g.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-4" /> {g._count.members}
                  </span>
                  <span className="flex items-center gap-1">
                    <Notebook className="size-4" /> {g._count.transactions} khoản
                  </span>
                  <span className="flex items-center gap-1">
                    <Handshake className="size-4" /> {g._count.loans} khoản mượn
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
