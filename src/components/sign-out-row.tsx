"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/** Hàng "Đăng xuất" trong trang Cài đặt — cùng dáng với các hàng LinkRow. */
export function SignOutRow() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/signin" })}
      className="flex min-h-16 w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-expense-surface text-expense">
        <LogOut className="size-5" />
      </span>
      <span className="flex-1 text-body-lg text-destructive">Đăng xuất</span>
    </button>
  );
}
