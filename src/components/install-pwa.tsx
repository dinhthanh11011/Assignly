"use client";
import { CheckCircle2, Download, HelpCircle } from "lucide-react";
import { InstallButton } from "@/components/install-button";
import { canInstallAtAll, useInstallState } from "@/lib/pwa-install";

/**
 * Mục "Cài ứng dụng" trong trang Cài đặt. Đúng một nút cho mọi trạng thái: nút cài
 * khi không gọi được prompt gốc thì tự mở hướng dẫn, nên nút "Xem cách cài" riêng chỉ
 * là cùng một hành động bày ra hai lần.
 *
 * 1. Đang chạy trong cửa sổ app (hoặc vừa cài xong) → chỉ báo đã cài, không có nút.
 * 2. Có prompt gốc → "Cài đặt app", bấm là hiện hộp thoại cài của trình duyệt.
 * 3. Không có prompt gốc (iOS…) → "Xem cách cài", bấm là ra hướng dẫn từng bước.
 * 4. Trình duyệt không cài được (Firefox/Safari máy tính) → cũng "Xem cách cài", vì
 *    hướng dẫn lúc này là cách mở app bằng trình duyệt cài được.
 */
export function InstallPwa() {
  const state = useInstallState();

  if (state.availability === "installed") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-success" />
        {state.justInstalled
          ? "Đã cài xong — mở app từ màn hình chính là dùng được ngay."
          : "Bạn đang dùng bản đã cài trên thiết bị này."}
      </p>
    );
  }

  const promptable = state.availability === "promptable";
  const supported = state.availability === "pending" || canInstallAtAll(state);

  return (
    <div className="space-y-3">
      <InstallButton variant={promptable ? "gradient" : "outline"}>
        {promptable ? (
          <>
            <Download className="size-4" /> Cài đặt app
          </>
        ) : (
          <>
            <HelpCircle className="size-4" /> Xem cách cài
          </>
        )}
      </InstallButton>
      <p className="text-xs text-muted-foreground">
        {!supported
          ? "Trình duyệt này không cài được app web — mở bằng Chrome, Edge hoặc Brave để cài."
          : promptable
            ? "Cài để mở nhanh từ màn hình chính và dùng được cả khi mạng yếu."
            : "Trình duyệt này không mời cài tự động, nhưng vẫn thêm được vào màn hình chính bằng vài bước."}
      </p>
    </div>
  );
}
