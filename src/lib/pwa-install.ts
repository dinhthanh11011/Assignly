"use client";
import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform = "ios" | "android" | "desktop";

/**
 * Trình duyệt chỉ bắn `beforeinstallprompt` một lần, thường ngay sau khi tải xong —
 * sớm hơn lúc trang Cài đặt được mount. Nên phải hứng ở tầng root (PwaRegister gọi
 * `initInstallCapture`) rồi giữ lại trong store này để mọi component đọc sau đó
 * vẫn còn cơ hội gọi `prompt()`.
 */
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let dismissed = false;
let started = false;
let snapshot: InstallState = {
  canInstall: false,
  installed: false,
  dismissed: false,
  platform: null,
};
const listeners = new Set<() => void>();

type InstallState = {
  canInstall: boolean;
  installed: boolean;
  /** User đã mở hộp thoại cài của trình duyệt rồi bấm huỷ trong lần tải trang này. */
  dismissed: boolean;
  /** null cho tới khi đọc được userAgent (tức là chưa hydrate xong). */
  platform: InstallPlatform | null;
};

function publish() {
  snapshot = {
    canInstall: deferred !== null,
    installed,
    dismissed,
    platform: detectInstallPlatform(),
  };
  for (const listener of listeners) listener();
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari không hỗ trợ display-mode cho tới bản mới, còn cờ này thì luôn có.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Khi app đã cài, Chrome không bắn `beforeinstallprompt` nữa — mà mở trong tab
 * browser thì `isStandalone()` vẫn false, nên không thể chỉ dựa vào display-mode.
 * API này (cần `related_applications` trong manifest) cho biết origin đã có bản cài.
 */
async function detectInstalledApp() {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform?: string }>>;
  };
  if (!nav.getInstalledRelatedApps) return;
  try {
    const apps = await nav.getInstalledRelatedApps();
    if (apps.length > 0) {
      installed = true;
      publish();
    }
  } catch {
    // Trình duyệt không cho gọi (không phải secure context…) thì bỏ qua.
  }
}

export function initInstallCapture() {
  if (typeof window === "undefined" || started) return;
  started = true;

  installed = isStandalone();
  if (!installed) void detectInstalledApp();
  window.addEventListener("beforeinstallprompt", (e) => {
    // Chặn thanh mời mặc định của Chrome để tự chọn thời điểm hiển thị.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    publish();
  });
  publish();
}

export function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  // iPadOS 13+ khai là Macintosh, phân biệt bằng cảm ứng.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // Sự kiện chỉ dùng được một lần; Chrome chỉ bắn lại ở lần tải trang sau.
  deferred = null;
  dismissed = outcome === "dismissed";
  publish();
  return outcome;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initInstallCapture();
  return () => listeners.delete(listener);
}

const serverSnapshot: InstallState = {
  canInstall: false,
  installed: false,
  dismissed: false,
  platform: null,
};

export function useInstallPrompt() {
  // Server render (và lúc hydrate) luôn thấy platform = null nên markup không lệch;
  // React đọc lại snapshot thật ngay sau khi subscribe.
  const state = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);

  return {
    ...state,
    /** Không có prompt tự động (iOS, Firefox…) thì phải chỉ user làm tay. */
    needsManualSteps:
      state.platform !== null && !state.canInstall && !state.installed && !state.dismissed,
    promptInstall,
  };
}
