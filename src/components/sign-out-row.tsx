"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { ButtonRow } from "@/components/setting-rows";

/** Hàng "Đăng xuất" trong Cài đặt. Khoá lại khi đang chuyển trang để không bấm hai lần. */
export function SignOutRow() {
  const [busy, setBusy] = useState(false);
  return (
    <ButtonRow
      icon={LogOut}
      tone="expense"
      label={busy ? "Đang đăng xuất…" : "Đăng xuất"}
      hint="Sổ và các khoản đã ghi vẫn còn nguyên"
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={() => {
        setBusy(true);
        signOut({ callbackUrl: "/signin" });
      }}
    />
  );
}
