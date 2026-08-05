"use client";
import { useEffect } from "react";
import { initInstallCapture } from "@/lib/pwa-install";

export function PwaRegister() {
  useEffect(() => {
    // Hứng `beforeinstallprompt` ngay từ tầng root — sự kiện chỉ bắn một lần và
    // thường sớm hơn lúc banner mời cài hay trang Cài đặt được mount.
    initInstallCapture();
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
