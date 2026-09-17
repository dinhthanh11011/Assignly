import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminGroupDetail } from "@/lib/admin-queries";
import { lastSeenText } from "@/lib/admin-copy";
import { roleLabel } from "@/lib/copy";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AdminFact,
  AdminFacts,
  AdminPageHeader,
  AdminSection,
  AdminStat,
  AdminStatGrid,
} from "@/components/admin/admin-shell";
import { GroupDangerZone, RemoveMemberButton } from "@/components/admin/group-actions";
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

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminGroupDetail(id);
  if (!detail) notFound();

  const { group, totalIncome, totalExpense, lastActivityAt } = detail;

  const candidates = group.members
    .filter((m) => m.user.id !== group.ownerId)
    .map((m) => ({ id: m.user.id, label: m.user.name ?? m.user.email ?? m.user.id }));

  return (
    <>
      <Link
        href="/admin/groups"
        className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg text-body text-primary hover:underline"
      >
        <ArrowLeft className="size-5 shrink-0" aria-hidden />
        Danh sách sổ
      </Link>

      <AdminPageHeader
        title={group.name}
        subtitle={`Người lập: ${group.owner.name ?? group.owner.email ?? "—"}`}
      />

      <AdminStatGrid>
        <AdminStat label="Thành viên" value={group._count.members} />
        <AdminStat label="Khoản ghi" value={group._count.transactions} />
        <AdminStat label="Tổng thu" value={formatMoney(totalIncome)} tone="income" />
        <AdminStat label="Tổng chi" value={formatMoney(totalExpense)} tone="expense" />
      </AdminStatGrid>

      <AdminSection title="Thông tin sổ">
        <div className="rounded-xl border border-border bg-card p-4">
          <AdminFacts>
            <AdminFact label="Lập ngày">{formatDate(group.createdAt)}</AdminFact>
            <AdminFact label="Khoản ghi gần nhất">
              {lastActivityAt ? formatDate(lastActivityAt) : "Chưa có khoản nào"}
            </AdminFact>
            <AdminFact label="Khoản mượn">{group._count.loans}</AdminFact>
            <AdminFact label="Lần cân đối tiền chung">{group._count.settlements}</AdminFact>
            <AdminFact label="Loại thu chi">{group._count.categories}</AdminFact>
            <AdminFact label="Yêu cầu xin vào sổ">{group._count.joinRequests}</AdminFact>
          </AdminFacts>
        </div>
      </AdminSection>

      <AdminSection title="Thành viên">
        <DataTable caption="Những người đang ở trong sổ này">
          <Thead>
            <Th>Người dùng</Th>
            <Th>Vai trò</Th>
            <Th>Mở app lần cuối</Th>
            <Th>Vào sổ từ</Th>
            <Th>Thao tác</Th>
          </Thead>
          <Tbody>
            {group.members.length === 0 && (
              <TableEmpty colSpan={5}>Sổ này chưa có ai.</TableEmpty>
            )}
            {group.members.map((m) => (
              <Tr key={m.user.id}>
                <TdLink href={`/admin/users/${m.user.id}`}>
                  {m.user.name ?? m.user.email ?? m.user.id}
                </TdLink>
                {/* Vai trò và trạng thái tài khoản là HAI chuyện khác nhau:
                    một người bị khoá vẫn đang là người quản lý sổ này. Bản đầu
                    ghi đè cái này lên cái kia và làm mất thông tin. */}
                <Td>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {roleLabel(m.role)}
                    {m.user.disabledAt && <Badge variant="destructive">Đã khoá</Badge>}
                  </span>
                </Td>
                <Td>{lastSeenText(m.user.lastSeenAt)}</Td>
                <Td>{formatDate(m.joinedAt)}</Td>
                <Td>
                  {m.user.id === group.ownerId ? (
                    <span className="text-caption text-muted-foreground">Người lập sổ</span>
                  ) : (
                    <RemoveMemberButton
                      groupId={group.id}
                      userId={m.user.id}
                      name={m.user.name ?? m.user.email ?? "Người này"}
                      groupName={group.name}
                    />
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </AdminSection>

      <AdminSection title="Thao tác nguy hiểm">
        <div className="rounded-xl border border-border bg-card p-4">
          <GroupDangerZone
            groupId={group.id}
            groupName={group.name}
            counts={{
              transactions: group._count.transactions,
              loans: group._count.loans,
              settlements: group._count.settlements,
              members: group._count.members,
            }}
            candidates={candidates}
          />
        </div>
      </AdminSection>
    </>
  );
}
