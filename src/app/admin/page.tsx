import Link from "next/link";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  HandCoins,
  Lock,
  NotebookPen,
  PenLine,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  getActivityTrend,
  getAdminOverview,
  getAttention,
  getEngagement,
  getFeatureAdoption,
  getGrowth,
  getRecentlyActiveUsers,
  getRecentSignups,
  getTopGroups,
  getWriterCounts,
} from "@/lib/admin-queries";
import { lastSeenText } from "@/lib/admin-copy";
import { cn, formatDate } from "@/lib/utils";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AdminPageHeader,
  AdminPanel,
  AdminStatGrid,
  KpiValue,
  PanelLink,
} from "@/components/admin/admin-shell";
import { ShareBar, TrendCard } from "@/components/admin/admin-charts";
import { DataTable } from "@/components/admin/data-table";
import { AccountBadges, UserCell } from "@/components/admin/cells";

export const metadata = { title: "Tổng quan" };

const nf = new Intl.NumberFormat("vi-VN");

export default async function AdminDashboard() {
  const [overview, engagement, writers, growth, trend, adoption, attention, topGroups, recent, signups] =
    await Promise.all([
      getAdminOverview(),
      getEngagement(),
      getWriterCounts(),
      getGrowth(),
      getActivityTrend(30),
      getFeatureAdoption(),
      getAttention(),
      getTopGroups(6),
      getRecentlyActiveUsers(6),
      getRecentSignups(6),
    ]);

  const todo = [
    {
      count: attention.brokenMigrations,
      icon: Database,
      tone: "danger" as const,
      title: "Migration chưa chạy xong",
      text: "Deploy kế tiếp sẽ bị chặn. Xem bảng migration để biết cách gỡ.",
      href: "/admin/health",
    },
    {
      count: attention.ownerLockedGroups,
      icon: BookOpen,
      tone: "warning" as const,
      title: "Sổ có người lập đã bị khoá",
      text: "Giao sổ cho thành viên khác để sổ còn người quản lý.",
      href: "/admin/groups?status=ownerLocked",
    },
    {
      count: attention.locked,
      icon: Lock,
      tone: "neutral" as const,
      title: "Tài khoản đang bị khoá",
      text: "Kiểm lại xem còn cần khoá không.",
      href: "/admin/users?status=locked",
    },
    {
      count: attention.staleJoinRequests,
      icon: UserPlus,
      tone: "neutral" as const,
      title: "Yêu cầu vào sổ chờ quá 7 ngày",
      text: "Người lập sổ chưa duyệt. Có thể nhắc họ.",
      href: "/admin/groups",
    },
    {
      count: attention.inactive,
      icon: UserMinus,
      tone: "neutral" as const,
      title: "Hơn 30 ngày không mở app",
      text: "Người đã được ghi nhận nhưng lâu không quay lại.",
      href: "/admin/users?status=inactive&sort=lastSeen&dir=asc",
    },
  ].filter((t) => t.count > 0);

  return (
    <>
      <AdminPageHeader
        title="Tổng quan"
        description={`${nf.format(overview.users)} người · ${nf.format(overview.groups)} sổ · ${nf.format(overview.transactions)} khoản ghi. So sánh với 30 ngày trước.`}
      />

      <AdminStatGrid>
        <Stat
          label="Người dùng"
          icon={Users}
          value={<KpiValue>{nf.format(growth.users.value)}</KpiValue>}
          delta={growth.users.delta}
          hint={`+${nf.format(growth.users.added)} trong 30 ngày · ${overview.admins} quản trị`}
        />
        <Stat
          label="Mở app 7 ngày (WAU)"
          icon={Activity}
          value={<KpiValue>{nf.format(engagement.d7)}</KpiValue>}
          hint={`24 giờ (DAU): ${nf.format(engagement.d1)} · 30 ngày (MAU): ${nf.format(engagement.d30)}`}
        />
        <Stat
          label="Có ghi chép 7 ngày"
          icon={PenLine}
          value={<KpiValue>{nf.format(growth.writers7.value)}</KpiValue>}
          delta={growth.writers7.delta}
          hint={`30 ngày: ${nf.format(writers.d30)} người`}
        />
        <Stat
          label="Sổ"
          icon={BookOpen}
          value={<KpiValue>{nf.format(growth.groups.value)}</KpiValue>}
          delta={growth.groups.delta}
          hint={`${nf.format(overview.sharedGroups)} sổ có từ hai người`}
        />
        <Stat
          label="Khoản thu chi"
          icon={NotebookPen}
          value={<KpiValue>{nf.format(growth.transactions.value)}</KpiValue>}
          delta={growth.transactions.delta}
          hint={`+${nf.format(growth.transactions.added)} trong 30 ngày · ${nf.format(overview.unknownAmount)} chưa rõ số tiền`}
        />
        <Stat
          label="Khoản mượn còn nợ"
          icon={HandCoins}
          value={<KpiValue>{nf.format(overview.activeLoans)}</KpiValue>}
          hint={`Trên tổng ${nf.format(overview.loans)} khoản mượn`}
        />
      </AdminStatGrid>
      {/* Hai cách đếm "đang dùng" không trừ cho nhau được — nói ra kẻo đọc sai. */}
      <p className="text-caption text-muted-foreground">
        <strong className="font-semibold">Mở app</strong> tính cả người chỉ vào xem, nhưng mới ghi nhận
        được {engagement.everSeen}/{engagement.total} người (chưa có kỳ trước để so).{" "}
        <strong className="font-semibold">Có ghi chép</strong> đếm người ghi khoản, khoản mượn, trả nợ
        hoặc cân đối — đúng cả với dữ liệu cũ.
      </p>

      <div className="grid grid-cols-1 gap-6 @min-[64rem]/admin:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <AdminPanel title="Hoạt động 30 ngày qua" hint="Mỗi điểm là một ngày theo giờ Việt Nam, kể cả ngày trống.">
            <TrendCard
              data={trend}
              caption="Số lượt ghi và số người ghi theo từng ngày trong 30 ngày qua"
              metrics={[
                { key: "writes", label: "Lượt ghi", unit: "lượt ghi", color: "var(--color-chart-1)" },
                { key: "writers", label: "Người ghi", unit: "người ghi", color: "var(--color-chart-2)" },
              ]}
            />
          </AdminPanel>
          <AdminPanel title="Người dùng mới">
            <TrendCard
              data={trend}
              caption="Số người dùng mới theo từng ngày trong 30 ngày qua"
              metrics={[{ key: "signups", label: "Người mới", unit: "người mới", color: "var(--color-chart-4)" }]}
            />
          </AdminPanel>
        </div>

        <div className="min-w-0 space-y-6">
          <AdminPanel title="Cần xử lý" flush>
            {todo.length === 0 ? (
              <EmptyState size="inline" icon={CheckCircle2} title="Không có gì cần xử lý">
                Migration ổn, không tài khoản nào bị khoá, không sổ nào mất người quản lý.
              </EmptyState>
            ) : (
              <ul role="list" className="divide-y divide-border">
                {todo.map((t) => (
                  <li key={t.title}>
                    <Link
                      href={t.href}
                      className="focus-ring-inset flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-sunken md:px-5"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg",
                          t.tone === "danger" && "bg-expense-surface text-expense",
                          t.tone === "warning" && "bg-warning-surface text-warning",
                          t.tone === "neutral" && "bg-sunken text-muted-foreground",
                        )}
                      >
                        <t.icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-body font-semibold">{t.title}</span>
                          <span className="num shrink-0 text-body-lg">{nf.format(t.count)}</span>
                        </span>
                        <span className="mt-0.5 block text-caption text-muted-foreground">{t.text}</span>
                      </span>
                      <ChevronRight className="mt-2.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <AdminPanel title="Tính năng được dùng" hint="Số người đã dùng ít nhất một lần, trên tổng số người.">
            <div className="space-y-4">
              <ShareBar label="Chia tiền nhiều người" value={adoption.splits} total={adoption.totalUsers} />
              <ShareBar label="Khoản mượn / cho mượn" value={adoption.loans} total={adoption.totalUsers} />
              <ShareBar label="Cân đối tiền chung" value={adoption.settlements} total={adoption.totalUsers} />
              <ShareBar label="Bật thông báo đẩy" value={adoption.push} total={adoption.totalUsers} />
              <ShareBar label="Dùng từ hai sổ" value={adoption.multiBook} total={adoption.totalUsers} />
              <p className="text-caption text-muted-foreground">
                {nf.format(overview.offlineWritten)} khoản đã được ghi lúc mất mạng (qua hàng chờ ngoại tuyến).
              </p>
            </div>
          </AdminPanel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 @min-[60rem]/admin:grid-cols-2">
        <AdminPanel title="Người mới đăng ký" flush action={<PanelLink href="/admin/users">Tất cả</PanelLink>}>
          <DataTable
            caption="Những người tạo tài khoản gần đây nhất"
            rows={signups}
            rowKey={(u) => u.id}
            rowHref={(u) => `/admin/users/${u.id}`}
            empty={<EmptyState size="inline" icon={UserPlus}>Chưa có ai đăng ký.</EmptyState>}
            columns={[
              { key: "user", header: "Người dùng", primary: true, cell: (u) => <UserCell user={u} /> },
              { key: "status", header: "Trạng thái", hideBelow: "xl", cell: (u) => <AccountBadges user={u} /> },
              { key: "tx", header: "Khoản ghi", numeric: true, cell: (u) => nf.format(u._count.transactions) },
              { key: "joined", header: "Tham gia", cell: (u) => formatDate(u.createdAt) },
            ]}
          />
        </AdminPanel>

        <AdminPanel title="Vừa mở app" flush action={<PanelLink href="/admin/users?sort=lastSeen">Tất cả</PanelLink>}>
          <DataTable
            caption="Những người mở ứng dụng gần đây nhất"
            rows={recent}
            rowKey={(u) => u.id}
            rowHref={(u) => `/admin/users/${u.id}`}
            empty={<EmptyState size="inline" icon={Activity}>Chưa ghi nhận được ai mở app.</EmptyState>}
            columns={[
              { key: "user", header: "Người dùng", primary: true, cell: (u) => <UserCell user={u} /> },
              { key: "seen", header: "Lần cuối", cell: (u) => lastSeenText(u.lastSeenAt) },
            ]}
          />
        </AdminPanel>
      </div>

      <AdminPanel title="Sổ bận rộn nhất" flush action={<PanelLink href="/admin/groups?sort=transactions">Tất cả sổ</PanelLink>}>
        <DataTable
          caption="Các sổ có nhiều khoản ghi nhất"
          rows={topGroups}
          rowKey={(g) => g.id}
          rowHref={(g) => `/admin/groups/${g.id}`}
          empty={<EmptyState size="inline" icon={BookOpen}>Chưa có sổ nào.</EmptyState>}
          columns={[
            { key: "name", header: "Tên sổ", primary: true, cell: (g) => g.name },
            {
              key: "owner",
              header: "Người lập",
              cell: (g) => <span className="text-muted-foreground">{g.owner.name ?? g.owner.email ?? "—"}</span>,
            },
            { key: "members", header: "Thành viên", numeric: true, cell: (g) => nf.format(g._count.members) },
            { key: "tx", header: "Khoản ghi", numeric: true, cell: (g) => nf.format(g._count.transactions) },
            { key: "loans", header: "Khoản mượn", numeric: true, cell: (g) => nf.format(g._count.loans) },
          ]}
        />
      </AdminPanel>
    </>
  );
}
