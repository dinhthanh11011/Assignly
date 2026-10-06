import { notFound } from "next/navigation";
import { BookOpen, NotebookPen, TriangleAlert, Users } from "lucide-react";
import { getAdminGroupDetail } from "@/lib/admin-queries";
import { displayName, lastSeenText } from "@/lib/admin-copy";
import { roleLabel } from "@/lib/copy";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
import { formatDate } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import {
  AdminFact,
  AdminFacts,
  AdminPageHeader,
  AdminPanel,
  AdminStatGrid,
  KpiValue,
} from "@/components/admin/admin-shell";
import { DeleteGroup, RemoveMemberButton, TransferOwnership } from "@/components/admin/group-actions";
import { DataTable } from "@/components/admin/data-table";
import { AccountBadges, TxAmount, UserCell } from "@/components/admin/cells";

const nf = new Intl.NumberFormat("vi-VN");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminGroupDetail(id);
  return { title: detail?.group.name ?? "Sổ" };
}

export default async function AdminGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminGroupDetail(id);
  if (!detail) notFound();

  const { group, totalIncome, totalExpense, lastActivityAt, recentTransactions } = detail;
  const ownerLocked = group.members.some((m) => m.user.id === group.ownerId && m.user.disabledAt);

  const candidates = group.members
    .filter((m) => m.user.id !== group.ownerId)
    .map((m) => ({ id: m.user.id, label: displayName(m.user) }));

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin/groups", label: "Sổ" }]}
        title={group.name}
        leading={
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary-surface text-primary" aria-hidden>
            <BookOpen className="size-7" />
          </span>
        }
        meta={
          <>
            <Badge variant={group._count.members > 1 ? "accent" : "muted"}>
              <Users aria-hidden />
              {group._count.members > 1 ? `Sổ chung · ${group._count.members} người` : "Sổ một người"}
            </Badge>
            <span className="text-caption text-muted-foreground">
              Người lập {displayName(group.owner)} · lập ngày {formatDate(group.createdAt)}
            </span>
          </>
        }
      />

      {ownerLocked && (
        <div role="status" className="flex gap-3 rounded-xl border border-border bg-warning-surface p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <p className="text-body">
            <span className="font-semibold">Người lập sổ đang bị khoá.</span> Sổ không còn ai quản lý — giao
            sổ cho một thành viên khác ở mục “Giao sổ” bên dưới.
          </p>
        </div>
      )}

      <AdminStatGrid wide={4}>
        <Stat label="Thành viên" icon={Users} value={<KpiValue>{nf.format(group._count.members)}</KpiValue>} />
        <Stat
          label="Khoản ghi"
          icon={NotebookPen}
          value={<KpiValue>{nf.format(group._count.transactions)}</KpiValue>}
          hint={lastActivityAt ? `Gần nhất ${formatDate(lastActivityAt)}` : "Chưa có khoản nào"}
        />
        <Stat label="Tổng thu" value={<Amount value={totalIncome} size="lg" icon />} />
        <Stat label="Tổng chi" value={<Amount value={-totalExpense} size="lg" icon />} />
      </AdminStatGrid>

      <div className="grid grid-cols-1 gap-6 @min-[60rem]/admin:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* ── Cột trái: thông tin + thao tác ── */}
        <div className="min-w-0 space-y-6">
          <AdminPanel title="Thông tin sổ">
            <AdminFacts>
              <AdminFact label="Lập ngày">{formatDate(group.createdAt)}</AdminFact>
              <AdminFact label="Khoản ghi gần nhất">
                {lastActivityAt ? formatDate(lastActivityAt) : "Chưa có"}
              </AdminFact>
              <AdminFact label="Khoản mượn" numeric>{nf.format(group._count.loans)}</AdminFact>
              <AdminFact label="Lần cân đối" numeric>{nf.format(group._count.settlements)}</AdminFact>
              <AdminFact label="Loại thu chi" numeric>{nf.format(group._count.categories)}</AdminFact>
              <AdminFact label="Mã mời" numeric>{nf.format(group._count.invites)}</AdminFact>
              <AdminFact label="Yêu cầu xin vào" numeric>{nf.format(group._count.joinRequests)}</AdminFact>
            </AdminFacts>
          </AdminPanel>

          <AdminPanel title="Giao sổ" hint="Sổ luôn phải có người đứng tên — làm việc này trước khi khoá người lập sổ.">
            <TransferOwnership groupId={group.id} groupName={group.name} candidates={candidates} />
          </AdminPanel>

          <AdminPanel title="Xoá sổ" hint="Xoá luôn mọi khoản ghi, khoản mượn, lần cân đối và thành viên của sổ.">
            <DeleteGroup
              groupId={group.id}
              groupName={group.name}
              counts={{
                transactions: group._count.transactions,
                loans: group._count.loans,
                settlements: group._count.settlements,
                members: group._count.members,
              }}
            />
          </AdminPanel>
        </div>

        {/* ── Cột phải: thành viên + hoạt động ── */}
        <div className="min-w-0 space-y-6">
          <AdminPanel title="Thành viên" flush>
            <DataTable
              caption="Những người đang ở trong sổ này"
              rows={group.members}
              rowKey={(m) => m.user.id}
              rowHref={(m) => `/admin/users/${m.user.id}`}
              empty={<EmptyState size="inline" icon={Users}>Sổ này chưa có ai.</EmptyState>}
              columns={[
                { key: "user", header: "Người dùng", primary: true, cell: (m) => <UserCell user={m.user} /> },
                {
                  // Vai trò trong sổ và trạng thái tài khoản là HAI chuyện khác nhau:
                  // người bị khoá vẫn có thể đang là người quản lý sổ này.
                  key: "role",
                  header: "Vai trò",
                  cell: (m) => (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span>{capitalize(roleLabel(m.role))}</span>
                      {m.user.disabledAt && <AccountBadges user={{ disabledAt: m.user.disabledAt, isAdmin: false }} />}
                    </span>
                  ),
                },
                { key: "seen", header: "Mở app", hideBelow: "xl", cell: (m) => lastSeenText(m.user.lastSeenAt) },
                { key: "joined", header: "Vào sổ từ", hideBelow: "lg", cell: (m) => formatDate(m.joinedAt) },
                {
                  key: "action",
                  header: "Thao tác",
                  interactive: true,
                  hideOnCard: false,
                  cell: (m) =>
                    m.user.id === group.ownerId ? (
                      <span className="text-caption text-muted-foreground">Người lập sổ</span>
                    ) : (
                      <RemoveMemberButton
                        groupId={group.id}
                        userId={m.user.id}
                        name={displayName(m.user)}
                        groupName={group.name}
                      />
                    ),
                },
              ]}
            />
          </AdminPanel>

          <AdminPanel title="Khoản ghi gần nhất" hint="8 khoản mới ghi nhất trong sổ." flush>
            <DataTable
              caption="Những khoản thu chi mới ghi nhất trong sổ"
              rows={recentTransactions}
              rowKey={(t) => t.id}
              empty={<EmptyState size="inline" icon={NotebookPen}>Chưa có khoản nào.</EmptyState>}
              columns={[
                {
                  key: "note",
                  header: "Ghi chú",
                  primary: true,
                  cell: (t) => (
                    <span className="block min-w-0">
                      <span className="block truncate">{t.note ?? "Không ghi chú"}</span>
                      <span className="block text-caption text-muted-foreground">
                        {formatDate(t.date)} · {displayName(t.createdBy)} ghi
                      </span>
                    </span>
                  ),
                },
                { key: "amount", header: "Số tiền", numeric: true, cell: (t) => <TxAmount t={t} /> },
              ]}
            />
          </AdminPanel>
        </div>
      </div>
    </>
  );
}
