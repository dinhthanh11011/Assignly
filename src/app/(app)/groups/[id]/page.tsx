import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, HandCoins, Shapes } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/member-avatar";
import { InvitePanel } from "@/components/invite-panel";
import { LeaveGroupButton } from "@/components/leave-group-button";
import { DeleteGroupButton } from "@/components/delete-group-button";
import { JoinRequests } from "@/components/join-requests";
import { RemoveMemberButton } from "@/components/remove-member-button";
import { SectionCard } from "@/components/page-shell";

const ROLE_LABEL = { OWNER: "chủ sổ", ADMIN: "quản trị", MEMBER: "thành viên" } as const;

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const data = await getGroupDetail(session!.user.id, id);
  if (!data) notFound();

  const { group, membership } = data;
  const canManage = membership.role !== "MEMBER";
  const currentUserId = session!.user.id;

  return (
    <div className="space-y-5">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Sổ chung
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <span className="brand-gradient flex size-12 shrink-0 items-center justify-center rounded-md text-lg font-bold text-white shadow-soft">
          {group.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {group.members.length} thành viên · {group._count.transactions} giao dịch ·{" "}
            {group._count.loans} khoản vay
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button asChild variant="outline" className="justify-start">
          <Link href={`/transactions?group=${group.id}`}>
            <ArrowLeftRight className="size-4 text-primary" /> Giao dịch
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href={`/loans?group=${group.id}`}>
            <HandCoins className="size-4 text-primary" /> Vay nợ
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href={`/categories?group=${group.id}`}>
            <Shapes className="size-4 text-primary" /> Danh mục ({group._count.categories})
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <SectionCard title="Mời người khác vào sổ">
            <InvitePanel
              groupId={group.id}
              code={group.invites[0]?.code ?? null}
              canManage={canManage}
            />
          </SectionCard>

          {canManage && (
            <SectionCard
              title="Yêu cầu tham gia"
              action={
                group.joinRequests.length > 0 ? (
                  <Badge variant="warning">{group.joinRequests.length}</Badge>
                ) : null
              }
              className="scroll-mt-20"
            >
              <div id="join-requests">
                <JoinRequests requests={group.joinRequests} />
              </div>
            </SectionCard>
          )}
        </div>

        <SectionCard title="Thành viên">
          <div className="space-y-1">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-md px-1 py-1.5">
                <MemberAvatar user={m.user} className="size-8" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.user.name || m.user.email}</div>
                  <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[m.role]}</div>
                </div>
                {canManage && m.role !== "OWNER" && m.userId !== currentUserId && (
                  <RemoveMemberButton
                    groupId={group.id}
                    userId={m.userId}
                    name={m.user.name || m.user.email || "thành viên này"}
                  />
                )}
              </div>
            ))}
          </div>
          {membership.role !== "OWNER" && (
            <div className="mt-3 border-t border-border/60 pt-3">
              <LeaveGroupButton groupId={group.id} />
            </div>
          )}
        </SectionCard>
      </div>

      {membership.role === "OWNER" && (
        <SectionCard title="Vùng nguy hiểm" className="border-destructive/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-sm text-muted-foreground">
              Xoá sổ sẽ xoá vĩnh viễn mọi giao dịch, khoản vay và danh mục của sổ với tất cả
              thành viên. Không thể hoàn tác.
            </p>
            <DeleteGroupButton
              groupId={group.id}
              groupName={group.name}
              counts={{
                members: group.members.length,
                transactions: group._count.transactions,
                loans: group._count.loans,
                categories: group._count.categories,
              }}
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
}
