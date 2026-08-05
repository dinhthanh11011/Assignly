"use client";
import { useState } from "react";
import { Check, Copy, MonitorDown, MoreVertical, Share, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InstallBrowser, InstallPlatform } from "@/lib/pwa-install";

type Guide = {
  icon: React.ElementType;
  title: string;
  description: string;
  steps: string[];
  note?: string;
};

/**
 * Hướng dẫn phải khớp đúng thiết bị đang cầm, không thì user tìm mục không tồn tại
 * rồi bỏ luôn. Khoá theo cả nền tảng và trình duyệt vì cùng là desktop mà Chromium
 * cài được còn Firefox/Safari thì không.
 */
function pickGuide(platform: InstallPlatform, browser: InstallBrowser): Guide {
  if (platform === "ios") {
    return {
      icon: Share,
      title: "Thêm vào màn hình chính",
      description: "iPhone và iPad cài app web qua menu Chia sẻ.",
      steps: [
        "Chạm nút Chia sẻ — hình ô vuông có mũi tên đi lên, ở thanh dưới (Safari) hoặc trên thanh địa chỉ.",
        "Kéo danh sách xuống, chọn “Thêm vào MH chính” (Add to Home Screen).",
        "Chạm “Thêm” ở góc trên phải.",
      ],
      note: "Chỉ bản đã thêm vào màn hình chính mới nhận được thông báo đẩy trên iPhone/iPad. Nếu không thấy mục đó, hãy mở lại trang này bằng Safari.",
    };
  }

  if (platform === "android") {
    return {
      icon: MoreVertical,
      title: "Cài ứng dụng trên Android",
      description: "Trình duyệt chưa tự mời cài, làm tay chỉ mất vài giây.",
      steps: [
        "Chạm nút ⋮ hoặc ☰ ở góc trên phải trình duyệt.",
        "Chọn “Cài đặt ứng dụng” hoặc “Thêm vào Màn hình chính”.",
        "Xác nhận “Cài đặt”.",
      ],
      note: "Không thấy mục nào? Thường là app đã cài rồi — kiểm tra trên màn hình chính, hoặc thử mở trang này bằng Chrome.",
    };
  }

  // Desktop: Firefox và Safari không có khái niệm cài PWA, nói thẳng còn hơn để user
  // đi tìm một mục menu không tồn tại.
  if (browser !== "chromium") {
    return {
      icon: TriangleAlert,
      title: "Trình duyệt này không cài được app",
      description: "Firefox và Safari trên máy tính không hỗ trợ cài ứng dụng web.",
      steps: [
        "Mở Sổ Thu Chi bằng Chrome, Edge hoặc Brave.",
        "Bấm biểu tượng cài đặt trên thanh địa chỉ (màn hình có mũi tên xuống).",
        "Xác nhận “Cài đặt”.",
      ],
      note: "Không cài cũng dùng bình thường được — chỉ là không có cửa sổ riêng và biểu tượng ngoài desktop.",
    };
  }

  return {
    icon: MonitorDown,
    title: "Cài ứng dụng lên máy tính",
    description: "Chrome, Edge và Brave đều cài được từ thanh địa chỉ.",
    steps: [
      "Nhìn cuối thanh địa chỉ, bấm biểu tượng cài đặt (màn hình có mũi tên xuống).",
      "Hoặc mở menu trình duyệt (⋮ / ☰) rồi tìm mục có chữ “Cài đặt” / “Install”.",
      "Xác nhận “Cài đặt”.",
    ],
    note: "Không thấy biểu tượng nào? Thường là app đã được cài trước đó.",
  };
}

export function InstallGuideDialog({
  platform,
  browser,
  appsPageUrl,
  open,
  onOpenChange,
}: {
  platform: InstallPlatform;
  browser: InstallBrowser;
  /** Địa chỉ trang app của trình duyệt (chrome://apps…), null nếu không có. */
  appsPageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const guide = pickGuide(platform, browser);
  const Icon = guide.icon;
  const [copied, setCopied] = useState(false);

  function copyAppsUrl() {
    if (!appsPageUrl) return;
    navigator.clipboard.writeText(appsPageUrl);
    setCopied(true);
    toast.success("Đã sao chép — dán vào thanh địa chỉ rồi nhấn Enter");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-primary" /> {guide.title}
          </DialogTitle>
          <DialogDescription>{guide.description}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ol className="space-y-3">
            {guide.steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          {guide.note && (
            <p className="mt-4 rounded-xl bg-sunken p-3 text-xs text-muted-foreground">
              {guide.note}
            </p>
          )}
          {appsPageUrl && (
            <div className="mt-3 space-y-2 rounded-xl bg-sunken p-3">
              <p className="text-xs text-muted-foreground">
                Muốn xem app đã cài hay chưa? Mở trang danh sách ứng dụng của trình duyệt — trang
                web không tự mở được địa chỉ này, bạn dán vào thanh địa chỉ rồi nhấn Enter.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-background px-2.5 py-1.5 font-mono text-xs">
                  {appsPageUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={copyAppsUrl}
                  aria-label={`Sao chép ${appsPageUrl}`}
                  title="Sao chép địa chỉ"
                >
                  {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
