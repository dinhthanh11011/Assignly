import Link from "next/link";
import {
  getActivityTrend,
  getAdminOverview,
  getEngagement,
  getFeatureAdoption,
  getInactiveUsers,
  getRecentlyActiveUsers,
  getTopGroups,
  getWriterCounts,
} from "@/lib/admin-queries";
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
import { ActivityChart, SignupChart } from "@/components/admin/admin-charts";
import { DataTable, Tbody, Td, TdLink, Th, Thead, TableEmpty, Tr } from "@/components/admin/data-table";
import { lastSeenText } from "@/lib/admin-copy";

export const metadata = { title: "Tổng quan" };

export default async function AdminDashboard() {
  const [overview, engagement, writers, trend, adoption, topGroups, recent, inactive] =
    await Promise.all([
      getAdminOverview(),
      getEngagement(),
      getWriterCounts(),
      getActivityTrend(30),
      getFeatureAdoption(),
      getTopGroups(10),
      getRecentlyActiveUsers(8),
      getInactiveUsers(30, 8),
    ]);

  const pct = (n: number) =>
    adoption.totalUsers === 0 ? "—" : `${Math.round((n / adoption.totalUsers) * 100)}%`;

  return (
    <>
      <AdminPageHeader
        title="Tổng quan"
        subtitle={`${overview.users} người · ${overview.groups} sổ · ${overview.transactions} khoản ghi`}
      />

      <AdminStatGrid>
        <AdminStat
          label="Người dùng"
          value={overview.users}
          hint={`${overview.admins} quản trị · ${overview.disabledUsers} đang bị khoá`}
        />
        <AdminStat
          label="Sổ"
          value={overview.groups}
          hint={`${overview.sharedGroups} sổ có từ hai người trở lên`}
        />
        <AdminStat
          label="Khoản thu chi"
          value={overview.transactions}
          hint={`${overview.unknownAmount} khoản chưa điền số tiền`}
        />
        <AdminStat
          label="Khoản mượn"
          value={overview.loans}
          hint={`${overview.activeLoans} khoản còn đang nợ`}
          tone="warning"
        />
      </AdminStatGrid>

      <AdminSection
        title="Có bao nhiêu người đang dùng"
        hint="Hai cách đếm khác nhau, đừng trộn vào nhau. Xem chú thích bên dưới."
      >
        <AdminStatGrid>
          {/* "24 giờ qua" chứ không phải "hôm nay": đây là cửa sổ trượt tính
              ngược từ lúc mở trang, không phải từ nửa đêm. Gọi là "hôm nay" thì
              con số sẽ không khớp với biểu đồ theo ngày ngay bên dưới. */}
          <AdminStat label="Mở app 24 giờ qua" value={engagement.d1} hint="Tính cả người chỉ vào xem" />
          <AdminStat label="Mở app 7 ngày qua" value={engagement.d7} />
          <AdminStat label="Mở app 30 ngày qua" value={engagement.d30} />
          <AdminStat
            label="Có ghi chép 30 ngày qua"
            value={writers.d30}
            hint={`24 giờ qua: ${writers.d1} người`}
            tone="income"
          />
        </AdminStatGrid>

        {/* Hai con số này KHÔNG so sánh trực tiếp được, và nếu không nói ra thì
            người đọc sẽ tự trừ chúng cho nhau rồi kết luận sai. */}
        <p className="text-caption text-muted-foreground">
          <strong className="font-semibold">Mở app</strong> đếm người thật sự vào ứng dụng, kể cả
          chỉ để xem báo cáo — nhưng chỉ tính được từ khi tính năng này ra đời, nên hiện mới có{" "}
          {engagement.everSeen}/{engagement.total} người từng được ghi nhận.{" "}
          <strong className="font-semibold">Có ghi chép</strong> đếm người thật sự ghi một khoản
          thu chi, khoản mượn, lần trả nợ hoặc lần cân đối — con số này đúng với cả dữ liệu cũ.
        </p>
      </AdminSection>

      <AdminSection title="Hoạt động 30 ngày qua" hint="Mỗi cột là một ngày, kể cả ngày không ai ghi gì.">
        <div className="rounded-xl border border-border bg-card p-4">
          <ActivityChart data={trend} />
        </div>
      </AdminSection>

      <AdminSection title="Người dùng mới 30 ngày qua">
        <div className="rounded-xl border border-border bg-card p-4">
          <SignupChart data={trend} />
        </div>
      </AdminSection>

      <AdminSection
        title="Tính năng nào có người dùng"
        hint="Đếm theo NGƯỜI đã từng dùng ít nhất một lần, không phải theo số bản ghi."
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <AdminFacts>
            <AdminFact label="Ghi khoản mượn / cho mượn">
              {adoption.loans} người · {pct(adoption.loans)}
            </AdminFact>
            <AdminFact label="Chia tiền cho nhiều người">
              {adoption.splits} người · {pct(adoption.splits)}
            </AdminFact>
            <AdminFact label="Cân đối tiền chung">
              {adoption.settlements} người · {pct(adoption.settlements)}
            </AdminFact>
            <AdminFact label="Bật thông báo đẩy">
              {adoption.push} người · {pct(adoption.push)}
            </AdminFact>
            <AdminFact label="Dùng từ hai sổ trở lên">
              {adoption.multiBook} người · {pct(adoption.multiBook)}
            </AdminFact>
            <AdminFact label="Khoản ghi lúc mất mạng">
              {overview.offlineWritten} khoản đã qua hàng chờ ngoại tuyến
            </AdminFact>
          </AdminFacts>
        </div>
      </AdminSection>

      <AdminSection title="Sổ bận rộn nhất" action={<Link className="focus-ring rounded-md text-body text-primary hover:underline" href="/admin/groups">Xem tất cả sổ</Link>}>
        <DataTable caption="Các sổ có nhiều khoản ghi nhất">
          <Thead>
            <Th>Tên sổ</Th>
            <Th>Người lập</Th>
            <Th numeric>Thành viên</Th>
            <Th numeric>Khoản ghi</Th>
            <Th numeric>Khoản mượn</Th>
          </Thead>
          <Tbody>
            {topGroups.length === 0 && <TableEmpty colSpan={5}>Chưa có sổ nào.</TableEmpty>}
            {topGroups.map((g) => (
              <Tr key={g.id}>
                <TdLink href={`/admin/groups/${g.id}`}>{g.name}</TdLink>
                <Td>{g.owner.name ?? g.owner.email ?? "—"}</Td>
                <Td numeric>{g._count.members}</Td>
                <Td numeric>{g._count.transactions}</Td>
                <Td numeric>{g._count.loans}</Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </AdminSection>

      <div className="grid grid-cols-1 gap-6 @min-[60rem]/admin:grid-cols-2">
        <AdminSection title="Vừa mở app gần đây">
          <DataTable caption="Những người mở ứng dụng gần đây nhất">
            <Thead>
              <Th>Người dùng</Th>
              <Th>Lần cuối</Th>
            </Thead>
            <Tbody>
              {recent.length === 0 && (
                <TableEmpty colSpan={2}>Chưa ghi nhận được ai mở app.</TableEmpty>
              )}
              {recent.map((u) => (
                <Tr key={u.id}>
                  <TdLink href={`/admin/users/${u.id}`}>{u.name ?? u.email ?? u.id}</TdLink>
                  <Td>{lastSeenText(u.lastSeenAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
        </AdminSection>

        <AdminSection title="Lâu rồi không mở app" hint="Chưa từng được ghi nhận, hoặc hơn 30 ngày không vào.">
          <DataTable caption="Những người lâu nhất không mở ứng dụng">
            <Thead>
              <Th>Người dùng</Th>
              <Th>Lần cuối</Th>
            </Thead>
            <Tbody>
              {inactive.length === 0 && <TableEmpty colSpan={2}>Không có ai.</TableEmpty>}
              {inactive.map((u) => (
                <Tr key={u.id}>
                  <TdLink href={`/admin/users/${u.id}`}>{u.name ?? u.email ?? u.id}</TdLink>
                  <Td>
                    {u.lastSeenAt ? (
                      lastSeenText(u.lastSeenAt)
                    ) : (
                      <Badge variant="muted">Tham gia {formatDate(u.createdAt)}</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
        </AdminSection>
      </div>
    </>
  );
}
