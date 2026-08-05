"use client";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ensurePushSubscription, isPushSupported } from "@/lib/push-client";

const DISMISS_KEY = "push-prompt-dismissed";

/**
 * Người dùng mới không phải tự vào Cài đặt bật thông báo: vừa vào app là xin quyền
 * và đăng ký đẩy luôn. Chrome/Edge cho gọi requestPermission mà không cần cử chỉ;
 * Firefox/Safari (kể cả PWA trên iOS) thì bắt buộc phải có cú chạm — khi đó mới
 * hiện thanh mời để lấy đúng một cú chạm đó.
 */
export function PushPrompt({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!vapidPublicKey || !isPushSupported()) return;
    // Đã từ chối thì tôn trọng, không hỏi lại (trình duyệt cũng sẽ chặn).
    if (Notification.permission === "denied") return;

    if (Notification.permission === "granted") {
      // Đã cho quyền nhưng subscription có thể mất (cài lại app, xoá dữ liệu site).
      ensurePushSubscription(vapidPublicKey).catch(() => {});
      return;
    }

    if (localStorage.getItem(DISMISS_KEY)) return;

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") await ensurePushSubscription(vapidPublicKey);
        else if (permission === "default") setVisible(true);
      } catch {
        setVisible(true);
      }
    })();
  }, [vapidPublicKey]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, "1");
        return;
      }
      await ensurePushSubscription(vapidPublicKey);
      setVisible(false);
      toast.success("Đã bật thông báo 🔔");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    // Nằm trên thanh điều hướng dưới ở mobile, góc phải ở desktop.
    <div className="fixed inset-x-4 bottom-24 z-50 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur md:inset-x-auto md:bottom-6 md:right-6 md:max-w-sm">
      <div className="flex gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="space-y-3">
          <div>
            <p className="font-semibold">Bật thông báo</p>
            <p className="text-sm text-muted-foreground">
              Để được nhắc khi có người trong sổ ghi khoản vay mới hoặc ghi nhận thu/trả nợ.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="gradient" onClick={enable} disabled={busy}>
              Bật thông báo
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
              Để sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
