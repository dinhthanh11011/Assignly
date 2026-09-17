"use client";
import { useState } from "react";
import { ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { setUserAdmin, setUserDisabled } from "@/lib/admin-actions";

/**
 * Hai thao tác trên một tài khoản: phong/gỡ quản trị, và khoá/mở khoá.
 *
 * Cả hai đều đi qua `ConfirmDialog`. Theo hợp đồng ghi ở đầu file đó, việc
 * KHÔNG PHẢI XOÁ thì phải override cả `pendingLabel`, `cancelLabel` lẫn
 * `confirmVariant` — cả ba mặc định ("Đang xoá…", "Thôi, giữ lại", nút đỏ) đều
 * mang hình dạng một cú xoá, để nguyên là nói với người dùng rằng tài khoản
 * sắp bị xoá.
 */
export function UserActions({
  userId,
  name,
  isAdmin,
  isDisabled,
  isBootstrapAdmin,
  isSelf,
}: {
  userId: string;
  name: string;
  isAdmin: boolean;
  isDisabled: boolean;
  /** Admin theo ADMIN_EMAILS — cột isAdmin có tắt cũng vô nghĩa. */
  isBootstrapAdmin: boolean;
  isSelf: boolean;
}) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  if (isSelf) {
    return (
      <p className="text-caption text-muted-foreground">
        Đây là tài khoản của bạn. Không tự đổi quyền hay tự khoá mình được — nhờ một quản trị viên
        khác nếu cần.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isAdmin ? "outline" : "default"}
          disabled={isBootstrapAdmin}
          onClick={() => setAdminOpen(true)}
        >
          {isAdmin ? <ShieldOff className="size-5" /> : <ShieldCheck className="size-5" />}
          {isAdmin ? "Gỡ quyền quản trị" : "Cấp quyền quản trị"}
        </Button>

        <Button
          variant={isDisabled ? "outline" : "destructive"}
          onClick={() => setDisableOpen(true)}
        >
          {isDisabled ? <UserCheck className="size-5" /> : <UserX className="size-5" />}
          {isDisabled ? "Mở khoá tài khoản" : "Khoá tài khoản"}
        </Button>
      </div>

      {isBootstrapAdmin && (
        <p className="text-caption text-muted-foreground">
          Người này là quản trị viên theo biến môi trường <span className="num">ADMIN_EMAILS</span>,
          nên nút cấp/gỡ quyền không có tác dụng. Sửa biến đó rồi khởi động lại app.
        </p>
      )}

      <ConfirmDialog
        open={adminOpen}
        onOpenChange={setAdminOpen}
        title={isAdmin ? "Gỡ quyền quản trị?" : "Cấp quyền quản trị?"}
        description={
          isAdmin
            ? `${name} sẽ không vào được trang quản trị nữa. Dữ liệu và các sổ của họ không đổi gì.`
            : `${name} sẽ xem được toàn bộ người dùng, mọi sổ và mọi con số của app — kể cả những sổ họ không tham gia. Họ cũng khoá được tài khoản của người khác.`
        }
        confirmLabel={isAdmin ? "Gỡ quyền quản trị" : "Cấp quyền quản trị"}
        confirmVariant={isAdmin ? "destructive" : "default"}
        pendingLabel="Đang lưu…"
        cancelLabel="Thôi"
        successMessage={isAdmin ? "Đã gỡ quyền quản trị" : "Đã cấp quyền quản trị"}
        onConfirm={() => setUserAdmin(userId, !isAdmin)}
      />

      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title={isDisabled ? "Mở khoá tài khoản?" : "Khoá tài khoản này?"}
        description={
          isDisabled
            ? `${name} đăng nhập và dùng app lại được như bình thường.`
            : `${name} sẽ bị đưa ra ngoài ngay lần chuyển trang kế tiếp và không đăng nhập lại được. Mọi khoản ghi, khoản mượn và sổ của họ GIỮ NGUYÊN — app không xoá tài khoản bao giờ. Mở khoá lại được bất cứ lúc nào.`
        }
        confirmLabel={isDisabled ? "Mở khoá tài khoản" : "Khoá tài khoản"}
        confirmVariant={isDisabled ? "default" : "destructive"}
        pendingLabel={isDisabled ? "Đang mở khoá…" : "Đang khoá…"}
        cancelLabel="Thôi"
        successMessage={isDisabled ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản"}
        onConfirm={() => setUserDisabled(userId, !isDisabled)}
      />
    </div>
  );
}
