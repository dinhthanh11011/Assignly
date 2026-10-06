import { BookOpen, Lock, SearchX } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  getGroupFilterCounts,
  GROUP_SORT_DEFAULT_DIR,
  listAdminGroups,
  parseGroupListParams,
  type GroupFilter,
  type GroupSort,
} from "@/lib/admin-queries";
import { displayName } from "@/lib/admin-copy";
import { formatDate } from "@/lib/utils";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminPager } from "@/components/admin/pagination";
import { DataTable } from "@/components/admin/data-table";
import { FilterChips, listHref } from "@/components/admin/list-toolbar";

export const metadata = { title: "Sổ" };

const nf = new Intl.NumberFormat("vi-VN");
const BASE = "/admin/groups";
const DEFAULTS = { sort: "created", status: "all", page: 1 };

const FILTERS: { value: GroupFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "shared", label: "Sổ chung" },
  { value: "solo", label: "Sổ một người" },
  { value: "ownerLocked", label: "Người lập bị khoá" },
];

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = parseGroupListParams(await searchParams);
  const [result, counts] = await Promise.all([listAdminGroups(p), getGroupFilterCounts()]);

  const cur = {
    q: p.q,
    status: p.status,
    sort: p.sort,
    dir: p.dir === GROUP_SORT_DEFAULT_DIR[p.sort] ? undefined : p.dir,
    page: p.page,
  };
  const href = (patch: Record<string, string | number | undefined>) => listHref(BASE, cur, patch, DEFAULTS);
  const filterLabel = FILTERS.find((f) => f.value === p.status)?.label;

  return (
    <>
      <AdminPageHeader
        title="Sổ"
        crumbs={[]}
        description={
          p.q
            ? `${nf.format(result.total)} sổ khớp với “${p.q}”`
            : `${nf.format(counts.all)} sổ trong hệ thống, ${nf.format(counts.shared)} sổ có từ hai người.`
        }
      />

      <section aria-label="Danh sách sổ" className="rounded-xl border border-border bg-card">
        <div className="space-y-3 border-b border-border p-3 md:p-4">
          <SearchBox
            value={p.q}
            label="Tìm sổ theo tên"
            placeholder="Tìm theo tên sổ…"
            clear={["page"]}
            className="md:max-w-md"
          />
          <FilterChips
            label="Lọc sổ"
            options={FILTERS.map((f) => ({
              label: f.label,
              count: counts[f.value],
              href: href({ status: f.value }),
              active: p.status === f.value,
            }))}
          />
        </div>

        <DataTable
          caption="Danh sách mọi sổ trong hệ thống"
          rows={result.items}
          rowKey={(g) => g.id}
          rowHref={(g) => `/admin/groups/${g.id}`}
          sort={{
            key: p.sort,
            dir: p.dir,
            defaults: GROUP_SORT_DEFAULT_DIR,
            href: (key, dir) =>
              href({
                sort: key,
                dir: dir === GROUP_SORT_DEFAULT_DIR[key as GroupSort] ? undefined : dir,
              }),
          }}
          empty={
            <EmptyState
              size="inline"
              icon={p.q ? SearchX : BookOpen}
              title={p.q ? `Không có sổ nào khớp với “${p.q}”` : "Không có sổ nào ở mục này"}
            >
              {p.status !== "all" ? `Đang lọc “${filterLabel}”. Thử bỏ lọc.` : "Thử tìm bằng một phần tên sổ."}
            </EmptyState>
          }
          columns={[
            {
              key: "name",
              header: "Tên sổ",
              sortKey: "name",
              primary: true,
              cell: (g) => (
                <span className="block min-w-0">
                  <span className="block truncate">{g.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-caption font-normal text-muted-foreground">
                    {displayName(g.owner)}
                    {g.owner.disabledAt && (
                      <Badge variant="destructive" className="py-0.5">
                        <Lock aria-hidden />
                        Đã khoá
                      </Badge>
                    )}
                  </span>
                </span>
              ),
            },
            { key: "members", header: "Thành viên", sortKey: "members", numeric: true, cell: (g) => nf.format(g._count.members) },
            { key: "tx", header: "Khoản ghi", sortKey: "transactions", numeric: true, cell: (g) => nf.format(g._count.transactions) },
            { key: "loans", header: "Khoản mượn", sortKey: "loans", numeric: true, cell: (g) => nf.format(g._count.loans) },
            {
              key: "settle",
              header: "Lần cân đối",
              numeric: true,
              hideBelow: "xl",
              hideOnCard: true,
              cell: (g) => nf.format(g._count.settlements),
            },
            { key: "created", header: "Lập ngày", sortKey: "created", cell: (g) => formatDate(g.createdAt) },
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
