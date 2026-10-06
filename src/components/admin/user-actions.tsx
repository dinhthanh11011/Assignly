"use client";
import { call } from "@/lib/action-result";
import { useState } from "react";
import { Info, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { setUserAdmin, setUserDisabled } from "@/lib/admin-actions";

/**
 * Phong/gỡ quản trị và khoá/mở khoá một tài khoản, mỗi việc qua ConfirmDialog.
 * Việc không phải xoá thì override pendingLabel / cancelLabel / confirmVariant
 * (mặc định của ConfirmDialog mang hình dạng một cú xoá).
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
      <p className="flex gap-2 text-body text-muted-foreground">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        Đây là tài khoản của bạn. Không tự đổi quyền hay tự khoá mình được — nhờ một quản trị viên khác.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Button
          className="w-full justify-start"
          variant={isDisabled ? "default" : "destructive"}
          onClick={() => setDisableOpen(true)}
        >
          {isDisabled ? <UserCheck aria-hidden /> : <UserX aria-hidden />}
          {isDisabled ? "Mở khoá tài khoản" : "Khoá tài khoản"}
        </Button>
        <p className="text-caption text-muted-foreground">
          {isDisabled
            ? "Người này đang không đăng nhập được."
            : "Đăng xuất họ ngay và chặn đăng nhập. Dữ liệu giữ nguyên."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Button
          className="w-full justify-start"
          variant="outline"
          disabled={isBootstrapAdmin}
          onClick={() => setAdminOpen(true)}
        >
          {isAdmin ? <ShieldOff aria-hidden /> : <ShieldCheck aria-hidden />}
          {isAdmin ? "Gỡ quyền quản trị" : "Cấp quyền quản trị"}
        </Button>
        {isBootstrapAdmin && (
          <p className="text-caption text-muted-foreground">
            Quản trị viên theo biến môi trường <span className="num">ADMIN_EMAILS</span> — sửa biến đó rồi
            khởi động lại app.
          </p>
        )}
      </div>

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
        successMessage={isAdmin ? `Đã gỡ quyền quản trị của ${name}` : `Đã cấp quyền quản trị cho ${name}`}
        onConfirm={() => call(setUserAdmin(userId, !isAdmin))}
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
        successMessage={isDisabled ? `Đã mở khoá tài khoản ${name}` : `Đã khoá tài khoản ${name}`}
        onConfirm={() => call(setUserDisabled(userId, !isDisabled))}
      />
    </div>
  );
}
