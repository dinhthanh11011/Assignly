"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brand } from "@/components/app-nav";
import { initials } from "@/lib/utils";

/**
 * Trên điện thoại: logo + bộ chọn sổ + chuông + avatar.
 *
 * Hai mục `md:hidden` "Danh mục" và "Cài đặt" trong menu avatar đã bị XOÁ — cả
 * hai giờ là đích đến thật trên thanh dưới hoặc là một hàng trong tab Cài đặt.
 * Giấu cả một trang trong menu avatar là chỗ không ai nghĩ tới mà tìm.
 */
export function TopBar({
  user,
  bell,
  picker,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  /** <NotificationBell/> — do layout truyền vào để nó stream riêng. */
  bell: React.ReactNode;
  /** <BookPicker/> — chỉ hiện ở điện thoại; desktop có nó trong thanh bên. */
  picker?: React.ReactNode;
}) {
  return (
    /* `pt` = vùng an toàn trên. App chạy standalone với viewport-fit=cover, nên
       mép trên của trang nằm DƯỚI đồng hồ/pin (~47–59px trên iPhone tai thỏ).
       Không trừ lại phần này thì logo, bộ chọn sổ, chuông và avatar bị thanh
       trạng thái đè lên. Padding đặt trên chính phần tử sticky để lúc cuộn nó
       vẫn lấp kín khoảng đó chứ không để nội dung chạy xuyên qua. */
    <header className="surface-bar sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-2 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] md:px-7">
        {/* Trên điện thoại không có thanh bên nên logo và bộ chọn sổ ở đây. Logo
            chỉ còn biểu tượng khi có bộ chọn sổ: trước đây chữ "Sổ Thu Chi" ăn hết
            chiều ngang, bộ chọn bị bóp còn icon + mũi tên nên không đọc được đang
            ở sổ nào, mà danh sách sổ mở ra cũng hẹp bằng nút → chỉ thấy dấu tích. */}
        <Brand className="shrink-0 md:hidden" compact={!!picker} />
        {picker && <div className="min-w-0 flex-1 md:hidden">{picker}</div>}
        <div className="hidden flex-1 md:block" />
        {bell}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-[3px] focus-visible:ring-ring">
            <Avatar className="size-10">
              {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
              <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="text-body text-foreground">{user.name}</div>
              <div className="truncate text-caption">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/signin" })}>
              <LogOut /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
