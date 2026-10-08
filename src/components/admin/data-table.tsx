import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileSort } from "@/components/admin/mobile-sort";

/**
 * Bảng dữ liệu của khu quản trị (server component).
 *
 * · ≥768px: `<table>` thật — header dính, cột số canh phải + chữ số đều, bấm
 *   tiêu đề để sắp xếp (đi qua URL, server sắp, nên giữ được qua phân trang).
 * · <768px: danh sách thẻ xếp chồng; nhãn cột thành nhãn trong thẻ, sắp xếp
 *   qua menu "Sắp xếp".
 * · Cả hàng/thẻ bấm được: link THẬT nằm ở ô chính và căng phủ cả hàng bằng
 *   `::after` (bọc `<tr>` trong `<a>` là HTML sai, onClick trên `<tr>` mất bàn
 *   phím và chuột giữa). Ô có nút riêng đánh dấu `interactive` để nổi lên trên.
 */

export type SortDir = "asc" | "desc";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Số đếm / số tiền: canh phải, chữ số đều bề ngang. */
  numeric?: boolean;
  /** Khoá sắp xếp gửi lên URL; không có thì cột không sắp được. */
  sortKey?: string;
  /** Nhãn trong menu sắp xếp trên điện thoại, ví dụ "Nhiều khoản ghi nhất". */
  sortLabel?: string;
  /** Cột chính: mang link của hàng, và là tiêu đề thẻ trên điện thoại. */
  primary?: boolean;
  /** Ô chứa nút/link riêng — phải nổi trên link phủ hàng. */
  interactive?: boolean;
  /** Ẩn cột khi BẢNG chưa đủ rộng (theo bề rộng bảng, không theo màn hình —
   *  cùng một bảng có thể nằm trong panel nửa màn). */
  hideBelow?: "lg" | "xl";
  /** Không lặp lại trong thẻ điện thoại (vd. đã nằm trong tiêu đề thẻ). */
  hideOnCard?: boolean;
  className?: string;
};

type SortState = {
  key: string;
  dir: SortDir;
  /** Chiều mặc định khi bấm một cột lần đầu. */
  defaults: Record<string, SortDir>;
  href: (key: string, dir: SortDir) => string;
};

const HIDE = {
  lg: "hidden @min-[44rem]/table:table-cell",
  xl: "hidden @min-[56rem]/table:table-cell",
} as const;

/** Link phủ cả hàng/thẻ. Vòng focus vẽ trên chính lớp phủ nên bao trọn hàng. */
const STRETCH =
  "outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-inset focus-visible:after:ring-ring";

export function DataTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  rowHref,
  sort,
  empty,
}: {
  /** Mô tả bảng cho screen reader (ẩn về mặt thị giác). */
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  sort?: SortState;
  /** Hiện thay cho bảng khi không có hàng nào. */
  empty: React.ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;

  const nextDir = (key: string): SortDir =>
    sort && sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : (sort?.defaults[key] ?? "desc");

  const sortOptions = sort
    ? columns
        .filter((c) => c.sortKey)
        .flatMap((c) => {
          const k = c.sortKey!;
          const first = sort.defaults[k] ?? "desc";
          const other: SortDir = first === "asc" ? "desc" : "asc";
          return [first, other].map((dir) => ({
            label: `${c.header} ${dirWord(k, dir, sort.defaults)}`,
            href: sort.href(k, dir),
            active: sort.key === k && sort.dir === dir,
          }));
        })
    : [];

  return (
    <>
      {/* ── Bảng (md+) ── */}
      <div className="@container/table hidden md:block">
        {/* border-separate: với border-collapse, viền của ô dính (sticky) không đi theo ô. */}
        <table className="w-full border-separate border-spacing-0 text-body">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort && c.sortKey && sort.key === c.sortKey;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={cn(
                      "sticky top-0 z-10 border-b border-border bg-sunken px-4 py-2.5 text-label font-semibold whitespace-nowrap text-muted-foreground",
                      c.numeric ? "text-right" : "text-left",
                      c.hideBelow && HIDE[c.hideBelow],
                      c.className,
                    )}
                  >
                    {sort && c.sortKey ? (
                      <Link
                        href={sort.href(c.sortKey, nextDir(c.sortKey))}
                        scroll={false}
                        className={cn(
                          "focus-ring -mx-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 transition-colors duration-150 hover:bg-card hover:text-foreground",
                          c.numeric && "flex-row-reverse",
                          active && "text-foreground",
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="size-4 shrink-0" aria-hidden />
                          ) : (
                            <ArrowDown className="size-4 shrink-0" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="size-4 shrink-0 text-border-strong" aria-hidden />
                        )}
                      </Link>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "group/row transition-colors duration-150",
                    href && "relative cursor-pointer hover:bg-sunken",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "border-b border-border px-4 py-3 align-middle group-last/row:border-b-0",
                        c.numeric ? "num text-right" : "text-left",
                        // Cột chính ăn phần bề ngang còn lại và tự cắt chữ (truncate chỉ
                        // chạy trong bảng auto-layout khi ô có max-width); cột phụ không
                        // xuống dòng — "Đang hoạt động" vỡ ba dòng trông như lỗi.
                        c.primary ? "w-full max-w-0" : "whitespace-nowrap",
                        c.hideBelow && HIDE[c.hideBelow],
                        c.className,
                      )}
                    >
                      {c.primary && href ? (
                        <Link href={href} className={cn(STRETCH, "block font-medium")}>
                          {c.cell(row)}
                        </Link>
                      ) : c.interactive ? (
                        <div className="relative z-10">{c.cell(row)}</div>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Thẻ xếp chồng (<md) ── */}
      <div className="md:hidden">
        {sortOptions.length > 0 && (
          <div className="flex justify-end border-b border-border px-3 py-1.5">
            <MobileSort options={sortOptions} />
          </div>
        )}
        <ul role="list" aria-label={caption} className="divide-y divide-border">
          {rows.map((row) => {
            const href = rowHref?.(row);
            const primary = columns.find((c) => c.primary) ?? columns[0];
            const rest = columns.filter((c) => c !== primary && !c.hideOnCard);
            return (
              <li
                key={rowKey(row)}
                className={cn(
                  "relative px-4 py-3.5 transition-colors duration-150",
                  href && "hover:bg-sunken active:bg-sunken",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 text-body-lg">
                    {href ? (
                      <Link href={href} className={STRETCH}>
                        {primary.cell(row)}
                      </Link>
                    ) : (
                      primary.cell(row)
                    )}
                  </div>
                  {href && <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                </div>
                {rest.length > 0 && (
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                    {rest.map((c) => (
                      <div key={c.key} className={cn("min-w-0", c.interactive && "relative z-10 col-span-2")}>
                        <dt className="text-caption text-muted-foreground">{c.header}</dt>
                        <dd className={cn("mt-0.5 text-body break-words", c.numeric && "num")}>
                          {c.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function dirWord(key: string, dir: SortDir, defaults: Record<string, SortDir>) {
  // Cột chữ mặc định A→Z; cột số/ngày mặc định lớn/mới trước.
  const textual = defaults[key] === "asc";
  if (textual) return dir === "asc" ? "(A → Z)" : "(Z → A)";
  return dir === "desc" ? "(cao → thấp)" : "(thấp → cao)";
}

/** Khung giữ chỗ của một bảng — cùng chiều cao hàng với bảng thật. */
export function DataTableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div aria-hidden>
      <div className="hidden md:block">
        <div className="flex gap-4 border-b border-border bg-sunken px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={cn("h-4", i === 0 ? "w-40" : "ml-auto w-16")} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-48" />
            {Array.from({ length: columns - 1 }).map((_, i) => (
              <Skeleton key={i} className="ml-auto h-4 w-14" />
            ))}
          </div>
        ))}
      </div>
      <div className="divide-y divide-border md:hidden">
        {Array.from({ length: Math.min(rows, 5) }).map((_, r) => (
          <div key={r} className="space-y-3 px-4 py-4">
            <Skeleton className="h-5 w-2/3" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
