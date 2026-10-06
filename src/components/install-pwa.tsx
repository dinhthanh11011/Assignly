"use client";
import { CheckCircle2, Download, HelpCircle, Smartphone } from "lucide-react";
import { InstallButton } from "@/components/install-button";
import { ControlRow } from "@/components/setting-rows";
import { Badge } from "@/components/ui/badge";
import { canInstallAtAll, useInstallState } from "@/lib/pwa-install";

/**
 * Hàng "Cài app vào máy" trong Cài đặt. Một nút cho mọi trạng thái: có prompt
 * gốc thì gọi prompt, không có (iOS, Firefox…) thì mở hướng dẫn từng bước.
 * Đang chạy bản đã cài thì chỉ báo "Đã cài".
 */
export function InstallPwa() {
  const state = useInstallState();

  if (state.availability === "installed") {
    return (
      <ControlRow
        icon={Smartphone}
        label="Ứng dụng trên máy"
        hint={
          state.justInstalled
            ? "Đã cài xong — mở từ màn hình chính là dùng được ngay"
            : "Bạn đang dùng bản đã cài trên thiết bị này"
        }
      >
        <Badge variant="success" icon={CheckCircle2}>
          Đã cài
        </Badge>
      </ControlRow>
    );
  }

  const promptable = state.availability === "promptable";
  const supported = state.availability === "pending" || canInstallAtAll(state);

  return (
    <ControlRow
      icon={Smartphone}
      label="Cài app vào máy"
      hint={
        !supported
          ? "Trình duyệt này không cài được — mở bằng Chrome, Edge hoặc Brave"
          : promptable
            ? "Mở nhanh từ màn hình chính, dùng được cả khi mạng yếu"
            : "Thêm vào màn hình chính bằng vài bước"
      }
    >
      <InstallButton variant="outline" size="sm">
        {promptable ? (
          <>
            <Download /> Cài app
          </>
        ) : (
          <>
            <HelpCircle /> Xem cách cài
          </>
        )}
      </InstallButton>
    </ControlRow>
  );
}
