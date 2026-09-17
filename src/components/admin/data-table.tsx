import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Bảng của khu quản trị — và là chỗ DUY NHẤT trong app dùng thẻ `<table>` thật.
 *
 * Phần còn lại của app cố ý không có bảng nào: nó mobile-first, nên dữ liệu
 * dạng bảng được vẽ thành hàng xếp chồng (`ui/row.tsx`, `member-spend-list.tsx`)
 * — đọc từ trên xuống, vùng bấm rộng cả màn hình. Đó là một quyết định về ĐIỆN
 * THOẠI, không phải một lệnh cấm, và nó không chuyển sang được khu này.
 *
 * Ở /admin người ta làm đúng một việc: so sánh giá trị giữa các hàng ("người
 * nào ghi nhiều nhất", "sổ nào chết"). Hàng xếp chồng thì mất tiêu đề cột, mà
 * tiêu đề cột mới là thứ làm "12 khoản · 3 sổ · mở app 4 ngày trước" đọc lướt
 * được. `<table>` còn cho screen reader quan hệ hàng–cột miễn phí, thứ mà hàng
 * xếp chồng chỉ giả được bằng `aria-*`.
 *
 * Bộ này cố tình mỏng — vài primitive có sẵn hình dáng, KHÔNG phải một engine
 * cấu hình cột. Ruột mỗi ô đặc thù theo từng trang, ép qua props chỉ làm API
 * phình ra vô nghĩa (cùng lý do `ui/row.tsx` xuất ra chuỗi class).
 */

export function DataTable({
  children,
  caption,
}: {
  children: React.ReactNode;
  /** Câu mô tả bảng cho screen reader. Ẩn về mặt thị giác. */
  caption: string;
}) {
  return (
    // overflow-x-auto: bảng dày cột không được đẩy cả trang trượt ngang. Ở bề
    // ngang điện thoại thì chính bảng cuộn, khung app đứng yên.
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-body">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-border bg-sunken">
      <tr>{children}</tr>
    </thead>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

/**
 * Tiêu đề cột. Chữ thường, KHÔNG viết hoa toàn bộ và không giãn chữ — cả hai đều
 * bị `scripts/check-ui-rules.sh` chặn, vì dấu tiếng Việt vỡ khi giãn chữ và chữ
 * hoa toàn bộ đọc chậm hơn hẳn.
 */
export function Th({
  children,
  numeric = false,
  className,
}: {
  children: React.ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-label font-semibold text-muted-foreground",
        numeric ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric = false,
  className,
}: {
  children: React.ReactNode;
  /** Số đếm và số tiền: canh phải + chữ số đều bề ngang, để mắt so theo cột. */
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle",
        numeric ? "num text-right" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="transition-colors hover:bg-sunken">{children}</tr>;
}

/**
 * Ô chứa link mở chi tiết của hàng.
 *
 * Cả hàng bấm được là thứ hay muốn làm, nhưng bọc `<tr>` trong `<a>` là HTML
 * không hợp lệ (chỉ `<td>`/`<th>` được làm con của `<tr>`), còn nhét onClick vào
 * `<tr>` thì mất bàn phím và mất chuột phải "mở tab mới". Nên link thật nằm ở ô
 * đầu — vẫn tab tới được, vẫn copy được địa chỉ.
 */
export function TdLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)}>
      <Link href={href} className="focus-ring -mx-1 block rounded-md px-1 hover:underline">
        {children}
      </Link>
    </td>
  );
}

/** Hàng "chưa có gì" nằm gọn trong bảng, thay vì một khối trống bên dưới. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-body text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
