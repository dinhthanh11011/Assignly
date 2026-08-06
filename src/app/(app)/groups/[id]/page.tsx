import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Handshake, Notebook, Tags } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { roleLabel } from "@/lib/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/member-avatar";
import { InvitePanel } from "@/components/invite-panel";
import { LeaveGroupButton } from "@/components/leave-group-button";
import { DeleteGroupButton } from "@/components/delete-group-button";
import { JoinRequests } from "@/components/join-requests";
import { RemoveMemberButton } from "@/components/remove-member-button";
import { OpenInGroupLink } from "@/components/scope-picker";
import { RenameGroupDialog } from "@/components/rename-group-dialog";
import { SectionCard } from "@/components/page-shell";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const data = await getGroupDetail(session!.user.id, id);
  if (!data) notFound();

  const { group, membership } = data;
  const canManage = membership.role !== "MEMBER";
  const currentUserId = session!.user.id;

  return (
    <div className="space-y-5">
      <Link
        href="/settings"
        className="inline-flex min-h-12 items-center gap-2 text-body text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" /> Quay lại Cài đặt
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-page text-primary-foreground shadow-soft">
          {group.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-page">{group.name}</h1>
          <p className="text-body text-muted-foreground">
            {group.members.length} người · {group._count.transactions} khoản ·{" "}
            {group._count.loans} khoản mượn
          </p>
        </div>
        {/* Đổi tên sổ: server action đã có sẵn từ lâu nhưng chưa màn hình nào gọi. */}
        {canManage && <RenameGroupDialog groupId={group.id} name={group.name} />}
      </div>

      {/* Mở sổ này ở các trang khác. OpenInGroupLink ghim sổ trước rồi mới đi,
          nên trang tiếp theo cũng đúng sổ này. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button asChild variant="outline" className="justify-start">
          <OpenInGroupLink groupId={group.id} href="/">
            <Notebook className="text-primary" /> Xem ghi chép
          </OpenInGroupLink>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <OpenInGroupLink groupId={group.id} href="/loans">
            <Handshake className="text-primary" /> Xem nợ
          </OpenInGroupLink>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <OpenInGroupLink groupId={group.id} href="/categories">
            <Tags className="text-primary" /> Các loại ({group._count.categories})
          </OpenInGroupLink>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
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
              title="Người xin vào sổ"
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

        <SectionCard title="Người trong sổ">
          <div className="space-y-1">
            {group.members.map((m) => (
              <div key={m.id} className="flex min-h-14 items-center gap-3 rounded-md px-1 py-1.5">
                <MemberAvatar user={m.user} className="size-10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body-lg">{m.user.name || m.user.email}</div>
                  <div className="text-caption text-muted-foreground">{roleLabel(m.role)}</div>
                </div>
                {canManage && m.role !== "OWNER" && m.userId !== currentUserId && (
                  <RemoveMemberButton
                    groupId={group.id}
                    userId={m.userId}
                    name={m.user.name || m.user.email || "người trong sổ này"}
                  />
                )}
              </div>
            ))}
          </div>
          {membership.role !== "OWNER" && (
            <div className="mt-3 border-t border-border pt-3">
              <LeaveGroupButton groupId={group.id} groupName={group.name} />
            </div>
          )}
        </SectionCard>
      </div>

      {membership.role === "OWNER" && (
        <SectionCard title="Xoá sổ này" className="border-destructive">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-body text-muted-foreground">
              Xoá sổ là mất hết, không lấy lại được: mọi khoản đã ghi, mọi khoản mượn kèm lịch sử
              trả, mọi loại thu chi. Tất cả người trong sổ cũng mất quyền xem.
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
