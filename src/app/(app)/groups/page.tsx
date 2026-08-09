import Link from "next/link";
import { ChevronRight, Clock, Handshake, Notebook, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getMyGroups, getMyPendingJoinRequests } from "@/lib/queries";
import { AvatarStack } from "@/components/member-avatar";
import { CreateGroupButton, JoinGroupButton } from "@/components/group-dialogs";
import { BackLink, PageHeader } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Sổ của tôi" };

export default async function GroupsPage() {
  const session = await getSession();
  const [groups, pending] = await Promise.all([
    getMyGroups(session!.user.id),
    getMyPendingJoinRequests(session!.user.id),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/settings" label="Quay lại Cài đặt" />
      <PageHeader
        title="Sổ của tôi"
        subtitle="Ghi riêng một mình, hoặc ghi chung với người thân"
      >
        <JoinGroupButton />
        <CreateGroupButton />
      </PageHeader>

      {/* Yêu cầu đang chờ đứng TRÊN danh sách sổ: người vừa bấm vào link mời hạ
          cánh đúng ở đây, và trước đây họ chỉ thấy "Chưa có sổ nào" — không dấu
          vết nào của việc họ vừa làm. */}
      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-label text-muted-foreground">
            Đang chờ duyệt
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex min-h-16 items-center gap-3.5 px-4 py-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-warning-surface text-warning">
                  <Clock className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-lg">{r.group.name}</p>
                  <p className="text-caption text-muted-foreground">
                    Đã gửi yêu cầu, đang chờ người quản lý đồng ý. Bạn sẽ nhận
                    được thông báo.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length === 0 ? (
        <EmptyState emoji="📒">
          Chưa có sổ nào. Tạo sổ mới, hoặc vào sổ của người khác bằng mã.
        </EmptyState>
      ) : (
        // <ul>/<li> vì đây là một danh sách; và tiêu đề là h2, không phải h3 —
        // trước đó trang nhảy thẳng từ h1 xuống h3. CẤP NGỮ NGHĨA VÀ CỠ NHÌN
        // THẤY LÀ HAI THỨ ĐỘC LẬP: h2 ở đây vẫn vẽ bằng text-body-lg.
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id} className="min-w-0">
              <Link
                href={`/groups/${g.id}`}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-sunken"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-body font-bold text-primary-foreground">
                  {g.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-body-lg group-hover:text-primary">
                    {g.name}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-4" /> {g._count.members}
                    </span>
                    <span className="flex items-center gap-1">
                      <Notebook className="size-4" /> {g._count.transactions}{" "}
                      khoản
                    </span>
                    <span className="flex items-center gap-1">
                      <Handshake className="size-4" /> {g._count.loans} khoản
                      mượn
                    </span>
                  </div>
                </div>
                <AvatarStack users={g.members.map((m) => m.user)} max={3} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
