"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { RowIcon, rowClass } from "@/components/ui/row";

/** Hàng "Đăng xuất" trong trang Cài đặt — cùng dáng với các hàng LinkRow. */
export function SignOutRow() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/signin" })}
      className={rowClass()}
    >
      <RowIcon icon={LogOut} tone="expense" />
      <span className="flex-1 text-body-lg text-destructive">Đăng xuất</span>
    </button>
  );
}
