import { ADMIN_PAGE_SIZE, listAdminUsers } from "@/lib/admin-queries";
import { accountStatusLabel, lastSeenText } from "@/lib/admin-copy";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Người dùng" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  // Số trang gõ tay trên URL: kẹp về 1 thay vì tin, để `?page=-3` hay `?page=abc`
  // không thành `skip` âm (Prisma ném lỗi) — cùng cách kho lưu nợ đang làm.
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const result = await listAdminUsers({ q, page });

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  return (
    <>
      <AdminPageHeader
        title="Người dùng"
        subtitle={
          q
            ? `${result.total} người khớp với “${q}”`
            : `${result.total} người, ${ADMIN_PAGE_SIZE} người mỗi trang`
        }
      />

      {/* clear={["page"]}: đổi chữ tìm khi đang ở trang 4 mà giữ ?page=4 thì kết
          quả mới thường ngắn hơn và người dùng rơi vào một trang rỗng. */}
      <SearchBox value={q} label="Tìm người dùng theo tên hoặc email" placeholder="Tên hoặc email…" clear={["page"]} />

      <DataTable caption="Danh sách người dùng của toàn hệ thống">
        <Thead>
          <Th>Người dùng</Th>
          <Th>Email</Th>
          <Th>Trạng thái</Th>
          <Th>Mở app lần cuối</Th>
          <Th numeric>Khoản ghi</Th>
          <Th numeric>Sổ</Th>
          <Th>Tham gia</Th>
        </Thead>
        <Tbody>
          {result.items.length === 0 && (
            <TableEmpty colSpan={7}>
              {q ? `Không có ai khớp với “${q}”.` : "Chưa có người dùng nào."}
            </TableEmpty>
          )}
          {result.items.map((u) => {
            const status = accountStatusLabel(u);
            return (
              <Tr key={u.id}>
                <TdLink href={`/admin/users/${u.id}`}>{u.name ?? "(chưa đặt tên)"}</TdLink>
                <Td className="text-muted-foreground">{u.email ?? "—"}</Td>
                <Td>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </Td>
                <Td>{lastSeenText(u.lastSeenAt)}</Td>
                <Td numeric>{u._count.transactions}</Td>
                <Td numeric>{u._count.memberships}</Td>
                <Td>{formatDate(u.createdAt)}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </DataTable>

      <AdminPager page={result.page} pages={result.pages} total={result.total} makeHref={makeHref} />
    </>
  );
}
