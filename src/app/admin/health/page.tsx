import { Prisma } from "@prisma/client";
import {
  Bell,
  BellDot,
  CheckCircle2,
  CircleAlert,
  Database,
  KeyRound,
  Smartphone,
  Tag,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { getSystemHealth, type MigrationRow } from "@/lib/admin-queries";
import { APP_VERSION, GIT_SHA } from "@/lib/version";
import { cn, formatDate } from "@/lib/utils";
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
import { DataTable } from "@/components/admin/data-table";

export const metadata = { title: "Tình trạng hệ thống" };

// Đọc process.env và chạy truy vấn thô lúc có request — ghi rõ để một lần
// refactor sau không vô tình đóng băng trang này lại.
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("vi-VN");

/** Bí mật: chỉ hiện CÓ hay KHÔNG, không bao giờ in giá trị. `required` = thiếu là app hỏng. */
const SECRETS = [
  { label: "Khoá phiên đăng nhập", name: "AUTH_SECRET", required: true },
  { label: "Google OAuth — client ID", name: "AUTH_GOOGLE_ID", required: true },
  { label: "Google OAuth — secret", name: "AUTH_GOOGLE_SECRET", required: true },
  { label: "Thông báo đẩy — khoá công khai", name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", required: false },
  { label: "Thông báo đẩy — khoá riêng", name: "VAPID_PRIVATE_KEY", required: false },
  { label: "Quản trị viên bootstrap", name: "ADMIN_EMAILS", required: false },
] as const;

function migrationState(m: MigrationRow) {
  if (m.rolledBackAt) return { label: "Đã rollback", variant: "warning" as const, icon: TriangleAlert };
  if (m.finishedAt) return { label: "Đã áp dụng", variant: "success" as const, icon: CheckCircle2 };
  return { label: "Dở dang / lỗi", variant: "destructive" as const, icon: XCircle };
}

export default async function AdminHealthPage() {
  const health = await getSystemHealth();
  const secrets = SECRETS.map((s) => ({ ...s, present: Boolean(process.env[s.name]) }));

  const rows = health.migrations.ok ? health.migrations.rows : [];
  const broken = rows.filter((m) => !m.finishedAt && !m.rolledBackAt);
  const rolledBack = rows.filter((m) => m.rolledBackAt);

  // Tóm tắt ở đầu trang: lỗi (đỏ) chặn deploy/đăng nhập; cảnh báo (vàng) nên xem.
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!health.migrations.ok) errors.push("Không đọc được bảng _prisma_migrations.");
  if (broken.length) errors.push(`${broken.length} migration dở dang — lần deploy sau sẽ bị chặn.`);
  for (const s of secrets) if (s.required && !s.present) errors.push(`Thiếu biến ${s.name}.`);
  if (rolledBack.length) warnings.push(`${rolledBack.length} migration đã rollback.`);
  for (const s of secrets) if (!s.required && !s.present) warnings.push(`Chưa đặt ${s.name}.`);
  if (!health.dbVersion) warnings.push("Không đọc được phiên bản PostgreSQL.");

  const level = errors.length ? "error" : warnings.length ? "warning" : "ok";
  const SummaryIcon = level === "error" ? XCircle : level === "warning" ? CircleAlert : CheckCircle2;
  const lastMigration = rows.filter((m) => m.finishedAt).at(-1);

  return (
    <>
      <AdminPageHeader
        title="Tình trạng hệ thống"
        crumbs={[]}
        description="Migration, thông báo đẩy và cấu hình của bản đang chạy."
      />

      <section
        aria-label="Tóm tắt"
        className={cn(
          "flex gap-4 rounded-xl border p-4 md:p-5",
          level === "error" && "border-destructive bg-expense-surface",
          level === "warning" && "border-border bg-warning-surface",
          level === "ok" && "border-border bg-income-surface",
        )}
      >
        <SummaryIcon
          className={cn(
            "mt-0.5 size-6 shrink-0",
            level === "error" && "text-expense",
            level === "warning" && "text-warning",
            level === "ok" && "text-income",
          )}
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-body-lg font-semibold">
            {level === "error"
              ? "Có lỗi cần xử lý ngay"
              : level === "warning"
                ? "Hệ thống chạy được, có vài điều nên xem"
                : "Mọi thứ đều ổn"}
          </p>
          {level === "ok" ? (
            <p className="text-body text-muted-foreground">
              {rows.length} migration đã áp dụng, đủ biến môi trường, đọc được cơ sở dữ liệu.
            </p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-5 text-body">
              {[...errors, ...warnings].map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AdminStatGrid wide={4}>
        <Stat
          label="Phiên bản app"
          icon={Tag}
          value={<KpiValue>{APP_VERSION}</KpiValue>}
          hint={GIT_SHA ? `Commit ${GIT_SHA}` : "Không có mã commit"}
        />
        <Stat
          label="Migration"
          icon={Database}
          value={<KpiValue>{nf.format(rows.length)}</KpiValue>}
          hint={lastMigration?.finishedAt ? `Gần nhất ${formatDate(lastMigration.finishedAt)}` : "Chưa có"}
        />
        <Stat
          label="Thiết bị nhận thông báo"
          icon={Smartphone}
          value={<KpiValue>{nf.format(health.pushDevices)}</KpiValue>}
          hint={`Của ${nf.format(health.pushPeople)} người`}
        />
        <Stat
          label="Thông báo chưa đọc"
          icon={health.unreadNotifications ? BellDot : Bell}
          value={<KpiValue>{nf.format(health.unreadNotifications)}</KpiValue>}
          hint={`Trên ${nf.format(health.notifications)} đã gửi`}
        />
      </AdminStatGrid>

      <div className="grid grid-cols-1 gap-6 @min-[60rem]/admin:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AdminPanel
          title="Lịch sử migration"
          hint="Đọc thẳng _prisma_migrations. Khi deploy lỗi: “bước đã chạy” bằng 0 thì gỡ bằng migrate resolve --rolled-back; lớn hơn 0 là CSDL đã bị sửa một phần, phải hoàn tác tay."
          flush
        >
          {health.migrations.ok ? (
            <DataTable
              caption="Các migration đã chạy trên cơ sở dữ liệu này"
              rows={[...rows].reverse()}
              rowKey={(m) => m.name}
              empty={<EmptyState size="inline" icon={Database}>Bảng migration rỗng.</EmptyState>}
              columns={[
                {
                  key: "name",
                  header: "Migration",
                  primary: true,
                  cell: (m) => <span className="font-mono text-caption break-all">{m.name}</span>,
                },
                {
                  key: "state",
                  header: "Trạng thái",
                  cell: (m) => {
                    const s = migrationState(m);
                    return (
                      <Badge variant={s.variant}>
                        <s.icon aria-hidden />
                        {s.label}
                      </Badge>
                    );
                  },
                },
                { key: "steps", header: "Bước đã chạy", numeric: true, cell: (m) => m.appliedSteps },
                {
                  key: "done",
                  header: "Xong lúc",
                  cell: (m) => (m.finishedAt ? formatDate(m.finishedAt) : "—"),
                },
              ]}
            />
          ) : (
            <div className="p-4 md:p-5">
              <p className="text-body text-destructive">Không đọc được bảng _prisma_migrations.</p>
              <p className="mt-1 font-mono text-caption break-all text-muted-foreground">
                {health.migrations.error}
              </p>
            </div>
          )}
        </AdminPanel>

        <div className="min-w-0 space-y-6">
          <AdminPanel title="Môi trường">
            <AdminFacts>
              <AdminFact label="Chế độ">{process.env.NODE_ENV}</AdminFact>
              <AdminFact label="Phiên bản app">{APP_VERSION}</AdminFact>
              <AdminFact label="Commit">{GIT_SHA ? <span className="font-mono">{GIT_SHA}</span> : "—"}</AdminFact>
              <AdminFact label="Prisma Client">{Prisma.prismaVersion.client}</AdminFact>
              <AdminFact label="PostgreSQL">
                {health.dbVersion?.split(" ").slice(0, 2).join(" ") ?? "Không đọc được"}
              </AdminFact>
              <AdminFact label="Thông báo đã gửi" numeric>{nf.format(health.notifications)}</AdminFact>
            </AdminFacts>
          </AdminPanel>

          <AdminPanel title="Cấu hình bí mật" hint="Chỉ hiện đã đặt hay chưa. Giá trị không bao giờ được in ra.">
            <ul role="list" className="divide-y divide-border">
              {secrets.map((s) => (
                <li key={s.name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block text-body">{s.label}</span>
                    <span className="flex items-center gap-1 font-mono text-caption text-muted-foreground">
                      <KeyRound className="size-3.5 shrink-0" aria-hidden />
                      {s.name}
                    </span>
                  </span>
                  {s.present ? (
                    <Badge variant="success">
                      <CheckCircle2 aria-hidden />
                      Đã đặt
                    </Badge>
                  ) : (
                    <Badge variant={s.required ? "destructive" : "warning"}>
                      <TriangleAlert aria-hidden />
                      {s.required ? "Thiếu" : "Chưa đặt"}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </AdminPanel>
        </div>
      </div>
    </>
  );
}
