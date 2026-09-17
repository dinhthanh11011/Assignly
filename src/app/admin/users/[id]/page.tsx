import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getAdminUserDetail } from "@/lib/admin-queries";
import { isBootstrapAdminEmail } from "@/lib/admin";
import { accountStatusLabel, deletionBlockerText, lastSeenText } from "@/lib/admin-copy";
import { transactionAmountText, roleLabel } from "@/lib/copy";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AdminFact,
  AdminFacts,
  AdminPageHeader,
  AdminSection,
  AdminStat,
  AdminStatGrid,
} from "@/components/admin/admin-shell";
import { UserActions } from "@/components/admin/user-actions";
import {
  DataTable,
  TableEmpty,
  Tbody,
  Td,
  TdLink,
  Th,
  Thead,
  Tr,
} from "@/components/admin/data-table";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, session] = await Promise.all([getAdminUserDetail(id), getSession()]);
  if (!detail) notFound();

  const { user, recentTransactions, blockers } = detail;
  const status = accountStatusLabel(user);
  const bootstrap = isBootstrapAdminEmail(user.email);
  const name = user.name ?? user.email ?? "Tài khoản này";

  return (
    <>
      <Link
        href="/admin/users"
        className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg text-body text-primary hover:underline"
      >
        <ArrowLeft className="size-5 shrink-0" aria-hidden />
        Danh sách người dùng
      </Link>

      <AdminPageHeader title={name} subtitle={user.email ?? undefined}>
        <Badge variant={status.variant}>{status.label}</Badge>
      </AdminPageHeader>

      <AdminStatGrid>
        <AdminStat label="Khoản đã ghi" value={user._count.transactions} />
        <AdminStat label="Khoản mượn đã ghi" value={user._count.loans} />
        <AdminStat label="Sổ đang tham gia" value={user._count.memberships} />
        <AdminStat label="Sổ đứng tên" value={user._count.ownedGroups} />
      </AdminStatGrid>

      <AdminSection title="Thông tin tài khoản">
        <div className="rounded-xl border border-border bg-card p-4">
          <AdminFacts>
            <AdminFact label="Tham gia">{formatDate(user.createdAt)}</AdminFact>
            <AdminFact label="Mở app lần cuối">{lastSeenText(user.lastSeenAt)}</AdminFact>
            <AdminFact label="Email đã xác minh">
              {user.emailVerified ? formatDate(user.emailVerified) : "Chưa"}
            </AdminFact>
            <AdminFact label="Quyền quản trị">
              {bootstrap
                ? "Có, theo biến môi trường ADMIN_EMAILS"
                : user.isAdmin
                  ? "Có"
                  : "Không"}
            </AdminFact>
            <AdminFact label="Thiết bị nhận thông báo">
              {user._count.pushSubscriptions}
            </AdminFact>
            <AdminFact label="Khoản họ bỏ tiền ra">{user._count.paidTransactions}</AdminFact>
          </AdminFacts>
        </div>
      </AdminSection>

      <AdminSection title="Thao tác">
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <UserActions
            userId={user.id}
            name={name}
            isAdmin={user.isAdmin}
            isDisabled={!!user.disabledAt}
            isBootstrapAdmin={bootstrap}
            isSelf={session?.user?.id === user.id}
          />

          {/* Người vận hành đi tìm nút "Xoá tài khoản" ở đúng chỗ này. Không có
              nút đó là một quyết định, nên lý do phải nằm ngay đây. */}
          <div className="border-t border-border pt-4">
            <h3 className="text-label text-muted-foreground">Vì sao không có nút xoá tài khoản</h3>
            <p className="mt-1 text-caption text-muted-foreground">
              {deletionBlockerText(blockers)}
            </p>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Các sổ đang tham gia">
        <DataTable caption="Những sổ người này đang ở trong">
          <Thead>
            <Th>Tên sổ</Th>
            <Th>Vai trò</Th>
            <Th numeric>Thành viên</Th>
            <Th>Vào sổ từ</Th>
          </Thead>
          <Tbody>
            {user.memberships.length === 0 && (
              <TableEmpty colSpan={4}>Chưa ở trong sổ nào.</TableEmpty>
            )}
            {user.memberships.map((m) => (
              <Tr key={m.group.id}>
                <TdLink href={`/admin/groups/${m.group.id}`}>{m.group.name}</TdLink>
                <Td>{roleLabel(m.role)}</Td>
                <Td numeric>{m.group._count.members}</Td>
                <Td>{formatDate(m.joinedAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </AdminSection>

      <AdminSection title="10 khoản ghi gần nhất">
        <DataTable caption="Những khoản thu chi người này ghi gần đây nhất">
          <Thead>
            <Th>Ngày</Th>
            <Th>Sổ</Th>
            <Th>Ghi chú</Th>
            <Th numeric>Số tiền</Th>
          </Thead>
          <Tbody>
            {recentTransactions.length === 0 && (
              <TableEmpty colSpan={4}>Chưa ghi khoản nào.</TableEmpty>
            )}
            {recentTransactions.map((t) => (
              <Tr key={t.id}>
                <Td>{formatDate(t.date)}</Td>
                <TdLink href={`/admin/groups/${t.group.id}`}>{t.group.name}</TdLink>
                <Td className="text-muted-foreground">{t.note ?? "—"}</Td>
                {/* transactionAmountText, KHÔNG phải formatMoney: khoản chưa rõ
                    số tiền lưu amount = 0, in thẳng ra sẽ thành "0 ₫" — một lời
                    nói dối về sổ của người ta. */}
                <Td numeric>{transactionAmountText(t)}</Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </AdminSection>
    </>
  );
}
