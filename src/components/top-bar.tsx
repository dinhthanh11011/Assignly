"use client";
import { signOut } from "next-auth/react";
import { LogOut, Settings, Shapes } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/app-nav";
import { initials } from "@/lib/utils";

export function TopBar({
  user,
  bell,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  /** <NotificationBell/> — do layout truyền vào để nó stream riêng. */
  bell: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-15 items-center gap-1 border-b border-hairline bg-background/70 px-4 backdrop-blur-2xl md:px-7">
      {/* Trên điện thoại không có sidebar nên hiện logo ở đây */}
      <Brand className="md:hidden" />
      <div className="flex-1" />
      {bell}
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger className="ml-1 rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-8">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
            <AvatarFallback className="text-xs">{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="font-semibold text-foreground">{user.name}</div>
            <div className="truncate text-xs font-normal">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="md:hidden">
            <Link href="/categories">
              <Shapes className="size-4" /> Danh mục
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="md:hidden">
            <Link href="/settings">
              <Settings className="size-4" /> Cài đặt
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="md:hidden" />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/signin" })}>
            <LogOut className="size-4" /> Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
