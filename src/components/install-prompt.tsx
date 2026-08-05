"use client";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InstallGuideDialog } from "@/components/install-guide-dialog";
import { useInstallPrompt } from "@/lib/pwa-install";

const SNOOZE_KEY = "install-prompt-snoozed-at";
const SNOOZE_DAYS = 7;
/** Đợi trang vẽ xong rồi mới mời, đừng chặn ngay giây đầu user vừa vào. */
const DELAY_MS = 2500;

function isSnoozed() {
  if (typeof window === "undefined") return true;
  return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_DAYS * 86_400_000;
}

/**
 * Đa số user không tìm nổi mục “Thêm vào màn hình chính” trong menu trình duyệt,
 * nên tự mời cài ngay lần đầu đăng nhập: có prompt gốc thì gọi luôn, còn iOS/Firefox
 * thì mở hướng dẫn từng bước.
 */
export function InstallPrompt() {
  const { canInstall, installed, needsManualSteps, platform, promptInstall } = useInstallPrompt();
  const [ready, setReady] = useState(false);
  const [snoozed, setSnoozed] = useState(isSnoozed);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function snooze() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setSnoozed(true);
  }

  async function install() {
    if (!canInstall) {
      setGuideOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success("Đang cài ứng dụng 🎉");
    // Từ chối rồi thì im trong một tuần, đừng làm phiền mỗi lần mở app.
    snooze();
  }

  const visible = ready && !snoozed && !installed && (canInstall || needsManualSteps);
  if (!visible) return null;

  return (
    <>
      <div className="pointer-events-auto rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="flex gap-3">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-3">
            <div>
              <p className="font-semibold">Cài Sổ Thu Chi vào máy</p>
              <p className="text-sm text-muted-foreground">
                Mở nhanh từ màn hình chính như một ứng dụng thật, chạy được cả khi mạng yếu.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="gradient" onClick={install}>
                {canInstall ? "Cài ứng dụng" : "Xem cách cài"}
              </Button>
              <Button size="sm" variant="ghost" onClick={snooze}>
                Để sau
              </Button>
            </div>
          </div>
        </div>
      </div>
      {platform && (
        <InstallGuideDialog
          platform={platform}
          open={guideOpen}
          onOpenChange={(open) => {
            setGuideOpen(open);
            if (!open) snooze();
          }}
        />
      )}
    </>
  );
}
