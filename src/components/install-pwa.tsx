"use client";
import { useState } from "react";
import { Download, HelpCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InstallGuideDialog } from "@/components/install-guide-dialog";
import { useInstallPrompt } from "@/lib/pwa-install";

export function InstallPwa() {
  const { canInstall, installed, dismissed, platform, promptInstall } = useInstallPrompt();
  const [guideOpen, setGuideOpen] = useState(false);

  if (installed) {
    return <p className="text-sm text-muted-foreground">Ứng dụng đã được cài đặt 🎉</p>;
  }

  return (
    <div className="space-y-3">
      {canInstall ? (
        <Button
          variant="gradient"
          onClick={async () => {
            const outcome = await promptInstall();
            if (outcome === "accepted") toast.success("Đang cài ứng dụng 🎉");
          }}
        >
          <Download className="size-4" /> Cài ứng dụng
        </Button>
      ) : dismissed ? (
        // Event `beforeinstallprompt` chỉ dùng được một lần, Chrome bắn lại ở lần tải sau.
        <>
          <p className="text-sm text-muted-foreground">
            Bạn vừa đóng hộp thoại cài đặt. Tải lại trang rồi bấm lại để cài.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="size-4" /> Tải lại trang
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Trình duyệt này không cho cài tự động, nhưng vẫn thêm được vào màn hình chính bằng vài
            bước.
          </p>
          <Button variant="outline" onClick={() => setGuideOpen(true)} disabled={!platform}>
            <HelpCircle className="size-4" /> Xem cách cài
          </Button>
        </>
      )}
      {platform && (
        <InstallGuideDialog platform={platform} open={guideOpen} onOpenChange={setGuideOpen} />
      )}
    </div>
  );
}
