"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  ensurePushSubscription,
  getPushSubscription,
  isPushSupported,
  removePushSubscription,
} from "@/lib/push-client";
import { cn } from "@/lib/utils";

type Status = "unknown" | "unsupported" | "denied" | "off" | "on";

/**
 * Công tắc thông báo đẩy trong Cài đặt. Quyền chỉ được xin sau cú chạm này
 * (không bao giờ tự hỏi lúc mở app). Trình duyệt đã chặn thì nói cách mở lại
 * thay vì một công tắc bấm không ăn.
 */
export function PushManager({ vapidPublicKey }: { vapidPublicKey: string }) {
  // "unknown" tới khi biết trạng thái thật, tránh nháy sai trạng thái lúc mount.
  const [status, setStatus] = useState<Status>("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: Status;
      if (!isPushSupported()) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else next = (await getPushSubscription().catch(() => null)) ? "on" : "off";
      if (alive) setStatus(next);
    })();
    return () => {
      alive = false;
    };
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
        setStatus(permission === "denied" ? "denied" : "off");
        toast.error("Bạn chưa cho phép gửi thông báo");
        return;
      }
      await ensurePushSubscription(vapidPublicKey);
      setStatus("on");
      toast.success("Đã bật thông báo");
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

  if (status === "unknown") return <span className="block h-11 w-14" aria-hidden />;

  if (status === "unsupported") {
    return (
      <p className="max-w-56 text-caption text-muted-foreground">
        Trình duyệt này không nhận thông báo. Cài app vào máy để bật.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="max-w-56 text-caption text-muted-foreground">
        Đang bị chặn — mở quyền Thông báo cho trang này trong cài đặt trình duyệt.
      </p>
    );
  }

  const on = status === "on";
  return <Switch checked={on} busy={busy} label="Thông báo đẩy" onChange={() => (on ? disable() : enable())} />;
}

/** Công tắc bật/tắt: rãnh 28px trong vùng bấm 44px, có chữ Bật/Tắt cạnh bên. */
export function Switch({
  checked,
  busy,
  label,
  onChange,
}: {
  checked: boolean;
  busy?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onChange}
      className="focus-ring -mr-1 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-1 disabled:cursor-wait"
    >
      <span aria-hidden className="text-label text-muted-foreground">
        {checked ? "Bật" : "Tắt"}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200",
          checked ? "border-primary bg-primary" : "border-border-strong bg-sunken"
        )}
      >
        <span
          className={cn(
            "flex size-5.5 items-center justify-center rounded-full bg-card shadow-soft transition-transform duration-200 ease-spring motion-reduce:transition-none",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          )}
        >
          {busy && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </span>
      </span>
    </button>
  );
}
