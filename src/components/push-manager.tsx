"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ensurePushSubscription,
  getPushSubscription,
  isPushSupported,
  removePushSubscription,
} from "@/lib/push-client";

export function PushManager({ vapidPublicKey }: { vapidPublicKey: string }) {
  // "unknown" cho tới khi biết trạng thái thật, tránh nháy sai nhãn khi mới mount.
  const [status, setStatus] = useState<"unknown" | "unsupported" | "off" | "on">("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = isPushSupported();
    getPushSubscription()
      .then((sub) => setStatus(!ok ? "unsupported" : sub ? "on" : "off"))
      .catch(() => setStatus(ok ? "off" : "unsupported"));
  }, []);

  async function enable() {
    if (!vapidPublicKey) {
      toast.error("Chưa cấu hình thông báo đẩy (thiếu khoá VAPID).");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Bạn đã từ chối quyền gửi thông báo");
        return;
      }
      await ensurePushSubscription(vapidPublicKey);
      setStatus("on");
      toast.success("Đã bật thông báo 🔔");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await removePushSubscription();
      setStatus("off");
      toast.success("Đã tắt thông báo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (status === "unknown") return <div className="h-9" />;

  if (status === "unsupported") {
    return (
      <p className="text-body text-muted-foreground">
        Trình duyệt này không hỗ trợ thông báo đẩy. Hãy cài ứng dụng để có trải nghiệm tốt nhất.
      </p>
    );
  }

  return status === "on" ? (
    <Button variant="outline" onClick={disable} disabled={busy}>
      <BellOff className="size-4" /> Tắt thông báo
    </Button>
  ) : (
    <Button variant="gradient" onClick={enable} disabled={busy}>
      <Bell className="size-4" /> Bật thông báo
    </Button>
  );
}
