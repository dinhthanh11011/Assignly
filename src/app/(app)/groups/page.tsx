import Link from "next/link";
import { BookOpen, ChevronRight, CircleDot, Clock, Handshake, Notebook } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMyGroups, getMyPendingJoinRequests, getScope } from "@/lib/queries";
import { AvatarStack } from "@/components/member-avatar";
import { CreateGroupButton, JoinGroupButton } from "@/components/group-dialogs";
import { BackLink, PageHeader } from "@/components/page-shell";
import { BookTile, RoleBadge } from "@/components/groups/role-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Sổ của tôi" };

export default async function GroupsPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [groups, pending, scope, roles] = await Promise.all([
    getMyGroups(userId),
    getMyPendingJoinRequests(userId),
    getScope(userId),
    // Vai trò của CHÍNH MÌNH ở từng sổ — getMyGroups chỉ lấy vài người đầu.
    prisma.groupMember.findMany({ where: { userId }, select: { groupId: true, role: true } }),
  ]);
  const roleOf = new Map(roles.map((r) => [r.groupId, r.role]));

  return (
    <div className="space-y-6">
      <BackLink href="/settings" label="Cài đặt" />
      <PageHeader title="Sổ của tôi" subtitle="Ghi riêng một mình, hoặc ghi chung với người thân">
        <JoinGroupButton />
        <CreateGroupButton />
      </PageHeader>

      {/* Yêu cầu đang chờ đứng TRÊN danh sách: người vừa bấm link mời hạ cánh ở
          đây và cần thấy dấu vết việc họ vừa làm. */}
      {pending.length > 0 && (
        <section aria-labelledby="pending-title" className="space-y-2">
          <h2 id="pending-title" className="px-1 text-label text-muted-foreground">
            Yêu cầu bạn đã gửi
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {pending.map((r) => (
              <li key={r.id} className="flex min-h-16 flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-surface text-warning"
                >
                  <Clock className="size-5" />
                </span>
                <div className="min-w-0 flex-[1_1_12rem]">
                  <p className="text-body-lg break-words">{r.group.name}</p>
                  <p className="text-caption text-muted-foreground">
                    Chờ người quản lý đồng ý — bạn sẽ nhận được thông báo.
                  </p>
                </div>
                <Badge variant="warning" size="sm" className="ml-auto">
                  Đang chờ duyệt
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa có sổ nào"
          action={
            <>
              <CreateGroupButton redirectTo="/" />
              <JoinGroupButton />
            </>
          }
        >
          Tạo sổ của riêng bạn, hoặc vào sổ của người thân bằng mã họ gửi.
        </EmptyState>
      ) : (
        <section aria-labelledby="books-title" className="space-y-2">
          <h2 id="books-title" className="px-1 text-label text-muted-foreground">
            {groups.length} sổ
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groups.map((g) => {
              const isActive = g.id === scope.groupId;
              const role = roleOf.get(g.id);
              return (
                <li key={g.id} className="min-w-0">
                  <Link
                    href={`/groups/${g.id}`}
                    className="focus-ring flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:bg-sunken"
                  >
                    <div className="flex items-start gap-3.5">
                      <BookTile name={g.name} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-body-lg font-semibold break-words">{g.name}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {role && <RoleBadge role={role} size="sm" />}
                          {isActive && (
                            <Badge variant="solid" size="sm" icon={CircleDot}>
                              Đang mở
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="mt-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3">
                      <span className="flex items-center gap-2.5">
                        <AvatarStack
                          users={g.members.map((m) => m.user)}
                          total={g._count.members}
                          max={4}
                        />
                        <span className="text-caption text-muted-foreground">{g._count.members} người</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Notebook className="size-4" aria-hidden /> {g._count.transactions} khoản
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Handshake className="size-4" aria-hidden /> {g._count.loans} khoản mượn
                        </span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
