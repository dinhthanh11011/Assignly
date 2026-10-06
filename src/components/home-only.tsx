"use client";
import { usePathname } from "next/navigation";

/**
 * Chỉ vẽ con ở trang Tổng quan. Dùng cho các thẻ mời (cài app, bật thông
 * báo): hiện ở trang sổ hay ngay sau khi ghi khoản là chen vào đúng lúc người
 * dùng đang làm việc khác.
 */
export function HomeOnly({ children }: { children: React.ReactNode }) {
  return usePathname() === "/" ? <>{children}</> : null;
}
