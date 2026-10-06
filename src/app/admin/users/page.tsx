import { SearchX, Users } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  getUserFilterCounts,
  listAdminUsers,
  parseUserListParams,
  USER_SORT_DEFAULT_DIR,
  type UserFilter,
  type UserSort,
} from "@/lib/admin-queries";
import { lastSeenText } from "@/lib/admin-copy";
import { formatDate } from "@/lib/utils";
import { SearchBox } from "@/components/search-box";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminPager } from "@/components/admin/pagination";
import { DataTable } from "@/components/admin/data-table";
import { FilterChips, listHref } from "@/components/admin/list-toolbar";
import { AccountBadges, UserCell } from "@/components/admin/cells";

export const metadata = { title: "Người dùng" };

const nf = new Intl.NumberFormat("vi-VN");
const BASE = "/admin/users";
const DEFAULTS = { sort: "joined", status: "all", page: 1 };

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "locked", label: "Đã khoá" },
  { value: "admin", label: "Quản trị" },
  { value: "inactive", label: "Hơn 30 ngày không vào" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = parseUserListParams(await searchParams);
  const [result, counts] = await Promise.all([
    listAdminUsers(p),
    getUserFilterCounts(),
  ]);

  // Chiều sắp bằng mặc định của cột thì không ghi lên URL.
  const cur = {
    q: p.q,
    status: p.status,
    sort: p.sort,
    dir: p.dir === USER_SORT_DEFAULT_DIR[p.sort] ? undefined : p.dir,
    page: p.page,
  };
  const href = (patch: Record<string, string | number | undefined>) => listHref(BASE, cur, patch, DEFAULTS);

  const filterLabel = FILTERS.find((f) => f.value === p.status)?.label;

  return (
    <>
      <AdminPageHeader
        title="Người dùng"
        crumbs={[]}
        description={
          p.q
            ? `${nf.format(result.total)} người khớp với “${p.q}”`
            : `${nf.format(counts.all)} tài khoản trong hệ thống. Bấm một hàng để xem chi tiết, khoá hoặc cấp quyền.`
        }
      />

      <section aria-label="Danh sách người dùng" className="rounded-xl border border-border bg-card">
        <div className="space-y-3 border-b border-border p-3 md:p-4">
          {/* clear page: đổi chữ tìm mà giữ ?page=4 thì dễ rơi vào trang rỗng. */}
          <SearchBox
            value={p.q}
            label="Tìm người dùng theo tên hoặc email"
            placeholder="Tìm theo tên hoặc email…"
            clear={["page"]}
            className="md:max-w-md"
          />
          <FilterChips
            label="Lọc theo trạng thái"
            options={FILTERS.map((f) => ({
              label: f.label,
              count: counts[f.value],
              href: href({ status: f.value }),
              active: p.status === f.value,
            }))}
          />
        </div>

        <DataTable
          caption="Danh sách người dùng của toàn hệ thống"
          rows={result.items}
          rowKey={(u) => u.id}
          rowHref={(u) => `/admin/users/${u.id}`}
          sort={{
            key: p.sort,
            dir: p.dir,
            defaults: USER_SORT_DEFAULT_DIR,
            href: (key, dir) =>
              href({
                sort: key,
                dir: dir === USER_SORT_DEFAULT_DIR[key as UserSort] ? undefined : dir,
              }),
          }}
          empty={
            <EmptyState
              size="inline"
              icon={p.q ? SearchX : Users}
              title={p.q ? `Không có ai khớp với “${p.q}”` : "Không có ai ở mục này"}
            >
              {p.status !== "all"
                ? `Đang lọc “${filterLabel}”. Thử bỏ lọc hoặc đổi chữ tìm.`
                : "Thử tìm bằng một phần tên hoặc email."}
            </EmptyState>
          }
          columns={[
            {
              key: "user",
              header: "Người dùng",
              sortKey: "name",
              primary: true,
              cell: (u) => <UserCell user={u} />,
            },
            { key: "status", header: "Trạng thái", cell: (u) => <AccountBadges user={u} /> },
            {
              key: "seen",
              header: "Mở app lần cuối",
              sortKey: "lastSeen",
              cell: (u) => (
                <span className={u.lastSeenAt ? undefined : "text-muted-foreground"}>
                  {lastSeenText(u.lastSeenAt)}
                </span>
              ),
            },
            {
              key: "tx",
              header: "Khoản ghi",
              sortKey: "transactions",
              numeric: true,
              cell: (u) => nf.format(u._count.transactions),
            },
            {
              key: "books",
              header: "Sổ",
              sortKey: "books",
              numeric: true,
              cell: (u) => nf.format(u._count.memberships),
            },
            {
              key: "joined",
              header: "Tham gia",
              sortKey: "joined",
              hideBelow: "lg",
              cell: (u) => formatDate(u.createdAt),
            },
          ]}
        />

        <AdminPager
          page={result.page}
          pages={result.pages}
          total={result.total}
          pageSize={ADMIN_PAGE_SIZE}
          makeHref={(n) => href({ page: n })}
        />
      </section>
    </>
  );
}
