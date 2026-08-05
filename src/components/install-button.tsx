"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { InstallGuideDialog } from "@/components/install-guide-dialog";
import { promptInstall, useInstallState } from "@/lib/pwa-install";

export type InstallOutcome = "accepted" | "dismissed" | "guided";

/**
 * Nút cài duy nhất của app. Có prompt gốc thì gọi prompt, không có thì mở hướng dẫn
 * làm tay — nên cú bấm nào cũng dẫn tới một việc dùng được. Mọi chỗ mời cài đều đi
 * qua component này để không nơi nào tự dựng một luồng cài khác.
 */
export function InstallButton({
  onOutcome,
  children,
  ...button
}: Omit<ButtonProps, "onClick"> & {
  onOutcome?: (outcome: InstallOutcome) => void;
}) {
  const { availability, platform, browser, appsPageUrl } = useInstallState();
  const [guideOpen, setGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function click() {
    if (availability !== "promptable") {
      setGuideOpen(true);
      return;
    }
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "accepted") {
      toast.success("Đang cài ứng dụng 🎉");
      onOutcome?.("accepted");
      return;
    }
    // Sự kiện của lần tải trang này đã dùng rồi (hoặc trình duyệt từ chối mở hộp
    // thoại) — vẫn còn đường cài tay.
    if (outcome === "unavailable") {
      setGuideOpen(true);
      return;
    }
    onOutcome?.("dismissed");
  }

  return (
    <>
      <Button {...button} onClick={click} disabled={busy || availability === "pending"}>
        {children}
      </Button>
      {platform && browser && (
        <InstallGuideDialog
          platform={platform}
          browser={browser}
          appsPageUrl={appsPageUrl}
          open={guideOpen}
          onOpenChange={(open) => {
            setGuideOpen(open);
            if (!open) onOutcome?.("guided");
          }}
        />
      )}
    </>
  );
}
