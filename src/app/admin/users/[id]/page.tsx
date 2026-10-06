import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Info, NotebookPen } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getAdminUserDetail } from "@/lib/admin-queries";
import { isBootstrapAdminEmail } from "@/lib/admin";
import { deletionBlockerText, displayName, lastSeenText } from "@/lib/admin-copy";
import { roleLabel } from "@/lib/copy";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
import { formatDate } from "@/lib/utils";
import { MemberAvatar } from "@/components/member-avatar";
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
import { UserActions } from "@/components/admin/user-actions";
import { DataTable } from "@/components/admin/data-table";
import { AccountBadges, TxAmount } from "@/components/admin/cells";

const nf = new Intl.NumberFormat("vi-VN");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminUserDetail(id);
  return { title: detail ? displayName(detail.user) : "Người dùng" };
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, session] = await Promise.all([getAdminUserDetail(id), getSession()]);
  if (!detail) notFound();

  const { user, recentTransactions, blockers } = detail;
  const bootstrap = isBootstrapAdminEmail(user.email);
  const name = displayName(user);

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin/users", label: "Người dùng" }]}
        title={name}
        description={user.email && user.name ? user.email : undefined}
        leading={<MemberAvatar user={user} className="size-14 text-body-lg" />}
        meta={
          <>
            <AccountBadges user={user} />
            <span className="text-caption text-muted-foreground">
              Tham gia {formatDate(user.createdAt)} · mở app {lastSeenText(user.lastSeenAt).toLowerCase()}
            </span>
          </>
        }
      />

      <AdminStatGrid wide={4}>
        <Stat label="Khoản đã ghi" icon={NotebookPen} value={<KpiValue>{nf.format(user._count.transactions)}</KpiValue>} />
        <Stat label="Khoản họ bỏ tiền" value={<KpiValue>{nf.format(user._count.paidTransactions)}</KpiValue>} />
        <Stat label="Khoản mượn đã ghi" value={<KpiValue>{nf.format(user._count.loans)}</KpiValue>} />
        <Stat
          label="Sổ đang tham gia"
          icon={BookOpen}
          value={<KpiValue>{nf.format(user._count.memberships)}</KpiValue>}
          hint={`Đứng tên ${user._count.ownedGroups} sổ`}
        />
      </AdminStatGrid>

      <div className="grid grid-cols-1 gap-6 @min-[60rem]/admin:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* ── Cột trái: thông tin + thao tác ── */}
        <div className="min-w-0 space-y-6">
          <AdminPanel title="Thông tin tài khoản">
            <AdminFacts>
              <AdminFact label="Tham gia">{formatDate(user.createdAt)}</AdminFact>
              <AdminFact label="Mở app lần cuối">{lastSeenText(user.lastSeenAt)}</AdminFact>
              <AdminFact label="Email đã xác minh">
                {user.emailVerified ? formatDate(user.emailVerified) : "Chưa"}
              </AdminFact>
              <AdminFact label="Quyền quản trị">
                {bootstrap ? "Có (ADMIN_EMAILS)" : user.isAdmin ? "Có" : "Không"}
              </AdminFact>
              <AdminFact label="Thiết bị nhận thông báo" numeric>
                {nf.format(user._count.pushSubscriptions)}
              </AdminFact>
              <AdminFact label="Lần trả nợ đã ghi" numeric>
                {nf.format(user._count.loanPayments)}
              </AdminFact>
              <AdminFact label="Lần cân đối đã ghi" numeric>
                {nf.format(user._count.settlementsCreated)}
              </AdminFact>
            </AdminFacts>
          </AdminPanel>

          <AdminPanel title="Thao tác">
            <UserActions
              userId={user.id}
              name={name}
              isAdmin={user.isAdmin}
              isDisabled={!!user.disabledAt}
              isBootstrapAdmin={bootstrap}
              isSelf={session?.user?.id === user.id}
            />
            {/* Người vận hành đi tìm nút "Xoá tài khoản" ở đúng chỗ này. */}
            <div className="mt-4 flex gap-2 rounded-lg bg-sunken p-3">
              <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-label">Vì sao không có nút xoá tài khoản</p>
                <p className="mt-1 text-caption text-muted-foreground">{deletionBlockerText(blockers)}</p>
              </div>
            </div>
          </AdminPanel>
        </div>

        {/* ── Cột phải: hoạt động ── */}
        <div className="min-w-0 space-y-6">
          <AdminPanel title="Các sổ đang tham gia" flush>
            <DataTable
              caption="Những sổ người này đang ở trong"
              rows={user.memberships}
              rowKey={(m) => m.group.id}
              rowHref={(m) => `/admin/groups/${m.group.id}`}
              empty={<EmptyState size="inline" icon={BookOpen}>Chưa ở trong sổ nào.</EmptyState>}
              columns={[
                { key: "name", header: "Tên sổ", primary: true, cell: (m) => m.group.name },
                { key: "role", header: "Vai trò", cell: (m) => <span>{capitalize(roleLabel(m.role))}</span> },
                { key: "members", header: "Thành viên", numeric: true, cell: (m) => nf.format(m.group._count.members) },
                { key: "joined", header: "Vào sổ từ", cell: (m) => formatDate(m.joinedAt) },
              ]}
            />
          </AdminPanel>

          <AdminPanel title="Khoản ghi gần nhất" hint="10 khoản mới nhất người này ghi, ở mọi sổ." flush>
            <DataTable
              caption="Những khoản thu chi người này ghi gần đây nhất"
              rows={recentTransactions}
              rowKey={(t) => t.id}
              empty={<EmptyState size="inline" icon={NotebookPen}>Chưa ghi khoản nào.</EmptyState>}
              columns={[
                {
                  key: "note",
                  header: "Ghi chú",
                  primary: true,
                  cell: (t) => (
                    <span className="block min-w-0">
                      <span className="block truncate">{t.note ?? "Không ghi chú"}</span>
                      <span className="block text-caption text-muted-foreground">{formatDate(t.date)}</span>
                    </span>
                  ),
                },
                {
                  key: "book",
                  header: "Sổ",
                  interactive: true,
                  cell: (t) => (
                    <Link
                      href={`/admin/groups/${t.group.id}`}
                      className="focus-ring rounded-sm text-primary underline-offset-4 hover:underline"
                    >
                      {t.group.name}
                    </Link>
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
