"use client";
import { useSyncExternalStore } from "react";

/** Sự kiện riêng của Chromium, chưa có trong lib.dom. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform = "ios" | "android" | "desktop";
export type InstallBrowser = "safari" | "chromium" | "firefox" | "other";

/**
 * Về việc cài đặt, web chỉ *biết chắc* được ba điều:
 *
 * - `installed` — trang đang chạy trong cửa sổ app đã cài (display-mode).
 * - `promptable` — trình duyệt vừa mời cài và mình còn giữ được sự kiện để gọi lại.
 * - `manual` — không có prompt gốc, chỉ còn cách hướng dẫn user làm tay.
 *
 * `pending` là giai đoạn chưa đọc được `navigator` (server render + trước hydrate).
 *
 * Không có trạng thái "đã cài trên máy này nhưng đang mở bằng tab": không API nào
 * trả lời được câu đó một cách đáng tin (`getInstalledRelatedApps` bị Brave chặn,
 * localStorage thì không biết user đã gỡ app, mẹo mở protocol handler rồi soi focus
 * thì sai mỗi khi user bấm ra ngoài). Đoán sai kiểu đó tạo ra nút "Mở app" bấm vào
 * không có gì xảy ra — tệ hơn là cứ mời cài, vì cài lại app đã có là vô hại.
 */
export type InstallAvailability = "pending" | "installed" | "promptable" | "manual";

export type InstallState = {
  availability: InstallAvailability;
  /** null khi `availability === "pending"`. */
  platform: InstallPlatform | null;
  browser: InstallBrowser | null;
  /** Vừa cài xong trong lần tải trang này (`appinstalled`). */
  justInstalled: boolean;
  /** User vừa bấm "Để sau" (hoặc huỷ hộp thoại cài) và thời gian im vẫn còn hiệu lực. */
  snoozed: boolean;
  /** Địa chỉ trang quản lý app của trình duyệt, null nếu trình duyệt không có. */
  appsPageUrl: string | null;
};

/** Firefox/Safari desktop không cài được PWA, hướng dẫn cũng không giúp gì. */
export function canInstallAtAll(state: InstallState) {
  return !(state.platform === "desktop" && state.browser !== "chromium");
}

const SNOOZE_KEY = "install-prompt-snoozed-until";
export const SNOOZE_LATER_DAYS = 7;
/** Huỷ ngay trong hộp thoại cài của trình duyệt là lời từ chối rõ ràng hơn "Để sau". */
export const SNOOZE_REJECTED_DAYS = 30;

const PENDING: InstallState = {
  availability: "pending",
  platform: null,
  browser: null,
  justInstalled: false,
  snoozed: false,
  appsPageUrl: null,
};

let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
let started = false;
let snapshot = PENDING;
const listeners = new Set<() => void>();

function isSnoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) > Date.now();
  } catch {
    // Chế độ riêng tư chặn localStorage → coi như chưa từng hoãn.
    return false;
  }
}

/** Hoãn lời mời cài trong `days` ngày, áp dụng cho mọi chỗ đang đọc store. */
export function snoozeInstall(days: number) {
  const until = Date.now() + days * 86_400_000;
  try {
    localStorage.setItem(SNOOZE_KEY, String(until));
  } catch {
    // Không ghi được thì chỉ mất phần ghi nhớ giữa các lần tải trang.
  }
  publish();
}

function publish() {
  const platform = detectPlatform();
  const browser = detectBrowser(platform);
  snapshot = {
    availability: isStandalone()
      ? "installed"
      : deferred
        ? "promptable"
        : justInstalled
          ? "installed"
          : "manual",
    platform,
    browser,
    justInstalled,
    snoozed: isSnoozed(),
    appsPageUrl: detectAppsPageUrl(platform, browser),
  };
  for (const listener of listeners) listener();
}

/** Chắc chắn nhất: trang đang chạy trong cửa sổ app đã cài. */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS Safari chỉ hỗ trợ display-mode từ 17.4; cờ riêng này thì bản nào cũng có.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  // iPadOS 13+ tự khai là Macintosh, phân biệt bằng cảm ứng.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Trên iOS mọi trình duyệt đều là WebKit nên chỉ có một luồng cài duy nhất — trả
 * `safari` luôn. Chỗ thật sự cần phân biệt là desktop: chỉ Chromium cài được PWA.
 */
function detectBrowser(platform: InstallPlatform): InstallBrowser {
  if (typeof navigator === "undefined") return "other";
  if (platform === "ios") return "safari";
  const ua = navigator.userAgent;
  if (/firefox|fxios/i.test(ua)) return "firefox";
  // Chromium nào cũng có `chrome/` trong UA (Edge, Brave, Opera, Samsung…).
  if (/chrome\/|chromium\/|crios/i.test(ua)) return "chromium";
  if (/safari/i.test(ua)) return "safari";
  return "other";
}

/**
 * Trang liệt kê app đã cài của trình duyệt — chỗ duy nhất user tự kiểm tra được là
 * máy đã có Sổ Thu Chi hay chưa (web không có API nào trả lời đáng tin).
 *
 * Chỉ trả địa chỉ để user tự gõ, *không* tự mở: Chromium chặn trang web điều hướng
 * sang scheme nội bộ, và cách chặn khác nhau theo từng bản. Bản trước cố lách bằng
 * cách mở tab trắng rồi ghi HTML hướng dẫn vào đó — phức tạp mà kết quả cuối cùng
 * vẫn là "user tự gõ địa chỉ".
 *
 * Chỉ có trên Chromium desktop; Chrome/Safari mobile không có trang này.
 */
function detectAppsPageUrl(platform: InstallPlatform, browser: InstallBrowser) {
  if (platform !== "desktop" || browser !== "chromium") return null;
  // Brave gắn `navigator.brave` nhưng UA vẫn khai là Chrome, nên phải xét trước.
  if ("brave" in navigator) return "brave://apps";
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return "edge://apps";
  if (/opr\//i.test(ua)) return "opera://apps";
  return "chrome://apps";
}

/**
 * `beforeinstallprompt` chỉ bắn một lần mỗi lần tải trang, thường trước khi bất kỳ
 * UI mời cài nào được mount — nên phải hứng từ tầng root (`PwaRegister`) và giữ lại
 * ở đây để component nào mount sau vẫn gọi được `prompt()`.
 */
export function initInstallCapture() {
  if (typeof window === "undefined" || started) return;
  started = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    // Chặn thanh mời mặc định của Chrome để tự chọn thời điểm hiển thị.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    publish();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    publish();
  });

  // Trình duyệt có thể đổi display-mode ngay trong lúc tab đang mở (mở app từ tab).
  const standalone = window.matchMedia("(display-mode: standalone)");
  standalone.addEventListener("change", publish);

  publish();
}

/**
 * Gọi hộp thoại cài của trình duyệt.
 *
 * `unavailable` nghĩa là không có prompt gốc để gọi (iOS, Firefox, hoặc sự kiện của
 * lần tải trang này đã dùng rồi) — phía UI phải chuyển sang hướng dẫn làm tay.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  // Sự kiện dùng được đúng một lần; Chrome chỉ bắn lại ở lần tải trang sau. Bỏ tham
  // chiếu ngay để cú bấm thứ hai rơi vào nhánh hướng dẫn thay vì gọi prompt() lỗi.
  deferred = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    publish();
    return outcome;
  } catch {
    publish();
    return "unavailable";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initInstallCapture();
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState & {
  /** Còn cách nào để user tự cài không (kể cả phải làm tay). */
  installable: boolean;
} {
  // Server và lần render đầu luôn thấy `pending` nên markup không lệch; React đọc
  // lại snapshot thật ngay sau khi subscribe.
  const state = useSyncExternalStore(subscribe, () => snapshot, () => PENDING);

  return {
    ...state,
    installable: state.availability !== "pending" && canInstallAtAll(state),
  };
}
