"use client";
import { Share, MoreVertical, MonitorDown } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InstallPlatform } from "@/lib/pwa-install";

const GUIDES: Record<
  InstallPlatform,
  { icon: React.ElementType; steps: string[]; note?: string }
> = {
  ios: {
    icon: Share,
    steps: [
      "Mở app bằng Safari (Chrome trên iPhone không cài được).",
      "Chạm nút Chia sẻ ở thanh dưới — hình ô vuông có mũi tên đi lên.",
      "Kéo xuống chọn “Thêm vào MH chính” (Add to Home Screen).",
      "Chạm “Thêm” ở góc trên phải.",
    ],
    note: "Cài xong mới nhận được thông báo đẩy trên iPhone/iPad.",
  },
  android: {
    icon: MoreVertical,
    steps: [
      "Chạm nút ⋮ ở góc trên phải trình duyệt.",
      "Chọn “Cài đặt ứng dụng” hoặc “Thêm vào Màn hình chính”.",
      "Xác nhận “Cài đặt”.",
    ],
  },
  desktop: {
    icon: MonitorDown,
    steps: [
      "Nhìn vào thanh địa chỉ, tìm biểu tượng cài đặt (màn hình có mũi tên xuống).",
      "Hoặc mở menu ⋮ → “Truyền, lưu và chia sẻ” → “Cài đặt trang này thành ứng dụng”.",
      "Xác nhận “Cài đặt”.",
    ],
    note: "Firefox không hỗ trợ cài ứng dụng web — hãy dùng Chrome, Edge hoặc Safari.",
  },
};

export function InstallGuideDialog({
  platform,
  open,
  onOpenChange,
}: {
  platform: InstallPlatform;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const guide = GUIDES[platform];
  const Icon = guide.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-primary" /> Cài Sổ Thu Chi lên thiết bị
          </DialogTitle>
          <DialogDescription>
            Trình duyệt này không cho cài tự động, làm theo mấy bước sau là xong.
          </DialogDescription>
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
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
