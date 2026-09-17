import { Prisma } from "@prisma/client";
import { getSystemHealth } from "@/lib/admin-queries";
import { APP_VERSION, GIT_SHA } from "@/lib/version";
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
import { DataTable, TableEmpty, Tbody, Td, Th, Thead, Tr } from "@/components/admin/data-table";

export const metadata = { title: "Tình trạng hệ thống" };

// Trang này đọc process.env và chạy truy vấn thô ngay lúc có request, nên nó vốn
// đã động. Ghi rõ để một lần refactor sau không vô tình đóng băng nó lại.
export const dynamic = "force-dynamic";

/** Chỉ hiện CÓ hay KHÔNG. Không bao giờ in giá trị — đây là trang web, không phải terminal. */
function EnvFact({ label, name }: { label: string; name: string }) {
  const present = Boolean(process.env[name]);
  return (
    <AdminFact label={label}>
      <Badge variant={present ? "success" : "warning"}>{present ? "Đã đặt" : "Chưa đặt"}</Badge>
    </AdminFact>
  );
}

export default async function AdminHealthPage() {
  const health = await getSystemHealth();

  return (
    <>
      <AdminPageHeader
        title="Tình trạng hệ thống"
        subtitle="Migration, thông báo, và cấu hình đang chạy"
      />

      <AdminStatGrid>
        <AdminStat
          label="Thiết bị nhận thông báo"
          value={health.pushDevices}
          hint={`Của ${health.pushPeople} người`}
        />
        <AdminStat label="Thông báo đã gửi" value={health.notifications} />
        <AdminStat label="Thông báo chưa đọc" value={health.unreadNotifications} tone="warning" />
        <AdminStat
          label="Phiên bản app"
          value={GIT_SHA ? `${APP_VERSION} · ${GIT_SHA}` : APP_VERSION}
        />
      </AdminStatGrid>

      <AdminSection
        title="Lịch sử migration"
        hint="Đọc thẳng bảng _prisma_migrations. Khi một lần deploy fail, “bước đã chạy” là con số quyết định: bằng 0 thì gỡ bằng migrate resolve, lớn hơn 0 nghĩa là CSDL đã bị sửa một phần và phải hoàn tác tay."
      >
        {health.migrations.ok ? (
          <DataTable caption="Các migration đã chạy trên cơ sở dữ liệu này">
            <Thead>
              <Th>Migration</Th>
              <Th>Trạng thái</Th>
              <Th numeric>Bước đã chạy</Th>
              <Th>Xong lúc</Th>
            </Thead>
            <Tbody>
              {health.migrations.rows.length === 0 && (
                <TableEmpty colSpan={4}>Bảng migration rỗng.</TableEmpty>
              )}
              {health.migrations.rows.map((m) => {
                const state = m.rolledBackAt
                  ? { label: "Đã rollback", variant: "warning" as const }
                  : m.finishedAt
                    ? { label: "Đã áp dụng", variant: "success" as const }
                    : { label: "Đang dở / thất bại", variant: "destructive" as const };
                return (
                  <Tr key={m.name}>
                    <Td>{m.name}</Td>
                    <Td>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </Td>
                    <Td numeric>{m.appliedSteps}</Td>
                    <Td>{m.finishedAt ? formatDate(m.finishedAt) : "—"}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </DataTable>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-body text-destructive">Không đọc được bảng _prisma_migrations.</p>
            <p className="mt-1 text-caption text-muted-foreground">{health.migrations.error}</p>
          </div>
        )}
      </AdminSection>

      <AdminSection title="Môi trường đang chạy">
        <div className="rounded-xl border border-border bg-card p-4">
          <AdminFacts>
            <AdminFact label="Chế độ">{process.env.NODE_ENV}</AdminFact>
            <AdminFact label="Prisma Client">{Prisma.prismaVersion.client}</AdminFact>
            <AdminFact label="PostgreSQL">
              {health.dbVersion?.split(" ").slice(0, 2).join(" ") ?? "Không đọc được"}
            </AdminFact>
            <AdminFact label="Phiên bản app">{APP_VERSION}</AdminFact>
          </AdminFacts>
        </div>
      </AdminSection>

      <AdminSection
        title="Cấu hình bí mật"
        hint="Chỉ hiện đã đặt hay chưa. Giá trị không bao giờ được in ra ở đây."
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <AdminFacts>
            <EnvFact label="Khoá phiên đăng nhập (AUTH_SECRET)" name="AUTH_SECRET" />
            <EnvFact label="Google OAuth (AUTH_GOOGLE_ID)" name="AUTH_GOOGLE_ID" />
            <EnvFact label="Google OAuth (AUTH_GOOGLE_SECRET)" name="AUTH_GOOGLE_SECRET" />
            <EnvFact label="Thông báo đẩy — khoá công khai" name="NEXT_PUBLIC_VAPID_PUBLIC_KEY" />
            <EnvFact label="Thông báo đẩy — khoá riêng" name="VAPID_PRIVATE_KEY" />
            <EnvFact label="Quản trị viên bootstrap (ADMIN_EMAILS)" name="ADMIN_EMAILS" />
          </AdminFacts>
        </div>
      </AdminSection>
    </>
  );
}
