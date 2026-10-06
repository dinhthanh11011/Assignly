import { notFound } from "next/navigation";
import { BarChart3, ChevronRight, CircleDot, Handshake, Notebook, Tags, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getGroupDetail, getScope } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { InvitePanel } from "@/components/invite-panel";
import { LeaveGroupButton } from "@/components/leave-group-button";
import { DeleteGroupButton } from "@/components/delete-group-button";
import { JoinRequests } from "@/components/join-requests";
import { MemberRow } from "@/components/member-actions";
import { OpenInGroupLink } from "@/components/scope-picker";
import { RenameGroupDialog } from "@/components/rename-group-dialog";
import { BackLink, SectionCard } from "@/components/page-shell";
import { BookTile, RoleBadge } from "@/components/groups/role-badge";
import { LedgerLiveRefresh } from "@/components/ledger-live-refresh";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const currentUserId = session!.user.id;
  const [data, scope] = await Promise.all([getGroupDetail(currentUserId, id), getScope(currentUserId)]);
  if (!data) notFound();

  const { group, membership } = data;
  const canManage = membership.role !== "MEMBER";
  const isOwner = membership.role === "OWNER";
  const isActive = scope.groupId === group.id;
  // Sổ chỉ có mình người lập sổ thì không có ai để giao — đường ra duy nhất là xoá sổ.
  const hasSomeoneToHandOver = group.members.some((m) => m.userId !== currentUserId);

  // OpenInGroupLink ghim sổ này trước rồi mới đi, nên trang tiếp theo đúng sổ.
  const quickLinks = [
    { href: "/ledger", icon: Notebook, label: "Sổ ghi chép", hint: `${group._count.transactions} khoản` },
    { href: "/loans", icon: Handshake, label: "Nợ", hint: `${group._count.loans} khoản mượn` },
    { href: "/reports", icon: BarChart3, label: "Báo cáo", hint: "Xu hướng thu chi" },
    { href: "/categories", icon: Tags, label: "Loại thu chi", hint: `${group._count.categories} loại` },
  ];

  return (
    <div className="space-y-6">
      <LedgerLiveRefresh groupId={group.id} />
      <BackLink href="/groups" label="Sổ của tôi" />

      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <BookTile name={group.name} size="lg" />
        <div className="min-w-0 flex-[1_1_14rem]">
          <h1 className="text-page break-words">{group.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={membership.role} size="sm" />
            {isActive && (
              <Badge variant="solid" size="sm" icon={CircleDot}>
                Đang mở
              </Badge>
            )}
            <span className="text-caption text-muted-foreground">· {group.members.length} người</span>
          </div>
        </div>
        {canManage && <RenameGroupDialog groupId={group.id} name={group.name} />}
      </header>

      <nav aria-label="Mở sổ này" className="grid grid-cols-1 gap-2 min-[22rem]:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((l) => (
          <OpenInGroupLink
            key={l.href}
            groupId={group.id}
            href={l.href}
            className="focus-ring flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors duration-150 hover:bg-sunken"
          >
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-surface text-primary">
              <l.icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold">{l.label}</span>
              <span className="block truncate text-caption text-muted-foreground">{l.hint}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </OpenInGroupLink>
        ))}
      </nav>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {canManage && (
            <SectionCard
              id="join-requests"
              className="scroll-mt-24"
              title="Người xin vào sổ"
              description="Chỉ người được duyệt mới xem và ghi được sổ này"
              action={
                group.joinRequests.length > 0 ? (
                  <Badge variant="warning">{group.joinRequests.length} đang chờ</Badge>
                ) : null
              }
            >
              <JoinRequests requests={group.joinRequests} />
            </SectionCard>
          )}

          <SectionCard
            title="Mời người khác vào sổ"
            description="Gửi link hoặc đọc mã cho họ. Họ gửi yêu cầu, người quản lý duyệt là xong."
          >
            <InvitePanel
              groupId={group.id}
              groupName={group.name}
              code={group.invites[0]?.code ?? null}
              canManage={canManage}
            />
          </SectionCard>
        </div>

        <SectionCard
          title={`Người trong sổ (${group.members.length})`}
          description={isOwner ? "Chạm vào một người để đổi quyền, giao sổ hoặc mời ra" : canManage ? "Chạm vào một người để mời ra khỏi sổ" : undefined}
        >
          <div className="-mx-5 divide-y divide-border border-y border-border">
            {group.members.map((m) => (
              <MemberRow
                key={m.id}
                groupId={group.id}
                groupName={group.name}
                user={m.user}
                role={m.role}
                isMe={m.userId === currentUserId}
                actions={{
                  // Giao sổ và đổi quyền là việc của người lập sổ; mời ra thì
                  // người quản lý cũng làm được.
                  role: isOwner && m.role !== "OWNER" && m.userId !== currentUserId,
                  transfer: isOwner && m.role !== "OWNER" && m.userId !== currentUserId,
                  remove: canManage && m.role !== "OWNER" && m.userId !== currentUserId,
                }}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Vùng nguy hiểm tách riêng, cuối trang. Người lập sổ không rời được
          (xem `leaveGroup`) — giao sổ xong họ thành quản lý và nút rời hiện ra. */}
      <section
        aria-labelledby="danger-title"
        className="overflow-hidden rounded-xl border border-expense"
      >
        <h2
          id="danger-title"
          className="flex items-center gap-2 border-b border-border bg-expense-surface px-5 py-3 text-body font-semibold text-expense"
        >
          <TriangleAlert className="size-5" aria-hidden /> Vùng nguy hiểm
        </h2>
        <div className="divide-y divide-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0 flex-[1_1_16rem]">
              <p className="text-body-lg">Rời sổ này</p>
              <p className="text-caption text-muted-foreground">
                {!isOwner
                  ? "Bạn không xem được sổ nữa; khoản bạn đã ghi vẫn còn trong sổ."
                  : hasSomeoneToHandOver
                    ? "Người lập sổ chưa rời được. Giao sổ cho một người ở danh sách trên trước."
                    : "Bạn đang một mình trong sổ. Không dùng nữa thì xoá sổ ở dưới."}
              </p>
            </div>
            {!isOwner && <LeaveGroupButton groupId={group.id} groupName={group.name} />}
          </div>
          {isOwner && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-[1_1_16rem]">
                <p className="text-body-lg text-destructive">Xoá sổ vĩnh viễn</p>
                <p className="text-caption text-muted-foreground">
                  Mất hết mọi khoản đã ghi, khoản mượn kèm lịch sử trả và các loại thu chi. Không
                  lấy lại được.
                </p>
              </div>
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
          )}
        </div>
      </section>
    </div>
  );
}
