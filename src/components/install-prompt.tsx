"use client";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallButton, type InstallOutcome } from "@/components/install-button";
import {
  SNOOZE_LATER_DAYS,
  SNOOZE_REJECTED_DAYS,
  snoozeInstall,
  useInstallState,
} from "@/lib/pwa-install";

/** Đợi trang vẽ xong rồi mới mời, đừng chặn ngay giây đầu user vừa vào. */
const DELAY_MS = 2500;
const VISITS_KEY = "install-prompt-visits";
/** Mời từ lần mở thứ hai: lần đầu user còn đang xem app này là cái gì. */
const MIN_VISITS = 2;

function countVisit() {
  try {
    const visits = Number(localStorage.getItem(VISITS_KEY)) + 1 || 1;
    localStorage.setItem(VISITS_KEY, String(visits));
    return visits;
  } catch {
    // Không đếm được thì cứ coi như đủ điều kiện, thà mời hơn là im mãi.
    return MIN_VISITS;
  }
}

/**
 * Đa số user không tìm nổi mục "Thêm vào màn hình chính" trong menu trình duyệt, nên
 * app tự mời — nhưng chỉ mời khi user đã quay lại lần thứ hai, và im hẳn một thời
 * gian sau mỗi lần bị từ chối. Thanh mời không tự gọi `prompt()`: hộp thoại cài của
 * trình duyệt cần một cú bấm thật, và bật nó lên khi user không yêu cầu thì chỉ
 * khiến họ bấm huỷ theo phản xạ.
 */
export function InstallPrompt() {
  const { availability, installable, snoozed } = useInstallState();
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (countVisit() < MIN_VISITS) return;
    const timer = setTimeout(() => setReady(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function close(days: number) {
    snoozeInstall(days);
    setClosed(true);
  }

  function settled(outcome: InstallOutcome) {
    // Đã cài xong thì `availability` tự thành "installed" và thanh mời biến mất.
    if (outcome !== "accepted") close(SNOOZE_REJECTED_DAYS);
  }

  if (!ready || closed || snoozed || !installable || availability === "installed") return null;

  return (
    // Vị trí do khung xếp chồng ở app layout quyết định.
    <div className="pointer-events-auto rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="flex gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="space-y-3">
          <div>
            <p className="font-semibold">Cài Sổ Thu Chi vào máy</p>
            <p className="text-body text-muted-foreground">
              Mở nhanh từ màn hình chính như một ứng dụng thật, chạy được cả khi mạng yếu.
            </p>
          </div>
          <div className="flex gap-2">
            <InstallButton size="sm" variant="gradient" onOutcome={settled}>
              {availability === "promptable" ? "Cài ứng dụng" : "Xem cách cài"}
            </InstallButton>
            <Button size="sm" variant="ghost" onClick={() => close(SNOOZE_LATER_DAYS)}>
              Để sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
