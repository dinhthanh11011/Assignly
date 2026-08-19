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
  action,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  /** <NotificationBell/> — do layout truyền vào để nó stream riêng. */
  bell: React.ReactNode;
  /** <BookPicker/> — chỉ hiện ở điện thoại; desktop có nó trong thanh bên. */
  picker?: React.ReactNode;
  /** <QuickAddFab/> — nút ghi khoản mới. Ở đây vì desktop cần một điểm vào
   *  nhìn thấy được; nút nổi cho điện thoại cũng do nó vẽ ra (position fixed
   *  nên không bị header giữ lại). */
  action?: React.ReactNode;
}) {
  return (
    /* `pt` = vùng an toàn trên. App chạy standalone với viewport-fit=cover, nên
       mép trên của trang nằm DƯỚI đồng hồ/pin (~47–59px trên iPhone tai thỏ).
       Không trừ lại phần này thì logo, bộ chọn sổ, chuông và avatar bị thanh
       trạng thái đè lên. Padding đặt trên chính phần tử sticky để lúc cuộn nó
       vẫn lấp kín khoảng đó chứ không để nội dung chạy xuyên qua. */
    /* z-40 chứ không phải z-20: nút "Ghi" nổi cho điện thoại được vẽ từ trong
       header (slot `action`), mà header sticky có z-index nên là một stacking
       context — ở z-20 thì nút nổi dù z-40 vẫn nằm DƯỚI thanh nav dưới (z-30)
       và biến mất. Header và thanh nav không bao giờ chồng nhau nên nâng z
       không che gì; các lớp nổi thật (dialog, thanh mời) đều ở z-50. */
    /* @container để cụm dưới đo được bề rộng THANH NÀY bằng `em` — tức là theo
       cỡ chữ người dùng đang chọn. Media query không thay được: `rem` trong
       media query luôn là 16px mặc định của trình duyệt, nó đứng yên khi gạt
       "Chữ lớn", mà "Chữ lớn" mới đúng là thứ làm hàng này vỡ. */
    <header className="@container surface-bar sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]">
      {/* Bộ chọn sổ XUỐNG HÀNG RIÊNG khi thanh hẹp so với cỡ chữ.
          Logo + chuông + avatar là ba thứ cứng, cộng lề và khe đã ăn ~11,5rem;
          phần còn lại cho tên sổ. Ở 320px × cỡ chữ lớn nó còn 90px, tức bộ chọn
          rụng hết chữ và chỉ còn cái icon với mũi tên — người dùng mất câu trả
          lời duy nhất cho "đang ghi vào sổ nào", mà trong app có sổ chung thì đó
          là câu đắt nhất khi trả lời sai.
          Ngưỡng 22em ≈ 11,5rem cứng + 10rem cho tên sổ — đo bằng chữ thật chứ
          không bằng phép cộng tối thiểu: ở đúng 20em tên sổ còn "Sổ…", tức vẫn
          hỏng dù không tràn. Trên 22em mọi thứ nằm gọn một hàng như cũ. */}
      <div className="flex min-h-16 flex-wrap items-center gap-2 px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] py-2 @min-[22em]:flex-nowrap @min-[22em]:py-0 md:px-7">
        {/* Trên điện thoại không có thanh bên nên logo và bộ chọn sổ ở đây. Logo
            chỉ còn biểu tượng khi có bộ chọn sổ: trước đây chữ "Sổ Thu Chi" ăn hết
            chiều ngang, bộ chọn bị bóp còn icon + mũi tên nên không đọc được đang
            ở sổ nào, mà danh sách sổ mở ra cũng hẹp bằng nút → chỉ thấy dấu tích. */}
        <Brand className="shrink-0 md:hidden" compact={!!picker} />
        {/* order-last + basis-full: khi hàng xuống dòng, bộ chọn phải rơi xuống
            DƯỚI chuông và avatar rồi trải hết bề ngang — không có nó thì nó rớt
            xuống trước, kéo theo chuông với avatar xuống cùng và hàng trên chỉ
            còn mỗi logo. */}
        {picker && (
          <div className="order-last min-w-0 basis-full @min-[22em]:order-none @min-[22em]:basis-auto @min-[22em]:flex-1 md:hidden">
            {picker}
          </div>
        )}
        <div className="hidden flex-1 md:block" />
        {action}
        {bell}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-full">
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
