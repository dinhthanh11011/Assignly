import { ADMIN_PAGE_SIZE, listAdminGroups } from "@/lib/admin-queries";
import { formatDate } from "@/lib/utils";
import { SearchBox } from "@/components/search-box";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminPager } from "@/components/admin/pagination";
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

export const metadata = { title: "Sổ" };

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const result = await listAdminGroups({ q, page });

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/admin/groups?${s}` : "/admin/groups";
  };

  return (
    <>
      <AdminPageHeader
        title="Sổ"
        subtitle={
          q
            ? `${result.total} sổ khớp với “${q}”`
            : `${result.total} sổ, ${ADMIN_PAGE_SIZE} sổ mỗi trang`
        }
      />

      <SearchBox value={q} label="Tìm sổ theo tên" placeholder="Tên sổ…" clear={["page"]} />

      <DataTable caption="Danh sách mọi sổ trong hệ thống">
        <Thead>
          <Th>Tên sổ</Th>
          <Th>Người lập</Th>
          <Th numeric>Thành viên</Th>
          <Th numeric>Khoản ghi</Th>
          <Th numeric>Khoản mượn</Th>
          <Th numeric>Lần cân đối</Th>
          <Th>Lập ngày</Th>
        </Thead>
        <Tbody>
          {result.items.length === 0 && (
            <TableEmpty colSpan={7}>
              {q ? `Không có sổ nào khớp với “${q}”.` : "Chưa có sổ nào."}
            </TableEmpty>
          )}
          {result.items.map((g) => (
            <Tr key={g.id}>
              <TdLink href={`/admin/groups/${g.id}`}>{g.name}</TdLink>
              <Td className="text-muted-foreground">
                {g.owner.name ?? g.owner.email ?? "—"}
              </Td>
              <Td numeric>{g._count.members}</Td>
              <Td numeric>{g._count.transactions}</Td>
              <Td numeric>{g._count.loans}</Td>
              <Td numeric>{g._count.settlements}</Td>
              <Td>{formatDate(g.createdAt)}</Td>
            </Tr>
          ))}
        </Tbody>
      </DataTable>

      <AdminPager page={result.page} pages={result.pages} total={result.total} makeHref={makeHref} />
    </>
  );
}
