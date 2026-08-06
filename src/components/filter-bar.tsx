"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavTransition } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

export type CategoryFilterOption = { id: string; name: string; icon: string | null };

/**
 * Bộ lọc của trang Ghi chép: MỘT hàng ba ô cố định + một nút mở danh sách loại.
 *
 * Bản cũ xếp hai hàng chip cuộn ngang chồng nhau, hàng loại có thể dài hai chục
 * mục. Với người lớn tuổi, một hàng cuộn ngang nghĩa là các nút đổi chỗ mỗi lần
 * nhìn — nên ba ô Tất cả / Tiền ra / Tiền vào ở đây là CỐ ĐỊNH, không bao giờ
 * cuộn, luôn đứng đúng chỗ đó.
 *
 * Phần đuôi dài (chọn loại) chuyển vào một sheet danh sách dọc, chọn một mục.
 * Bộ lọc đang bật hiện thành chip xoá được ngay bên dưới, để trạng thái "đang
 * lọc" không bao giờ bị nhầm với "sổ chưa có gì".
 */
export function FilterBar({
  type,
  categoryId,
  categories,
}: {
  type: "INCOME" | "EXPENSE" | undefined;
  categoryId: string | undefined;
  categories: CategoryFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [optimisticType, setOptimisticType] = useState<string | null>(null);

  const shownType = pending && optimisticType !== null ? optimisticType : (type ?? "");

  const setParams = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  const pickType = (next: string) => {
    setOptimisticType(next);
    // Đổi chiều thì bỏ luôn loại đang chọn: loại có phân chi/thu, giữ lại sẽ ra
    // danh sách rỗng mà người dùng không hiểu vì sao.
    setParams({ type: next || null, category: null });
  };

  const activeCategory = categories.find((c) => c.id === categoryId);
  // Chỉ hiện đúng những loại thuộc chiều đang xem.
  const visible = categories;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div
          role="radiogroup"
          aria-label="Xem tiền vào hay tiền ra"
          className="flex flex-1 gap-1.5 rounded-full border-[1.5px] border-border bg-sunken p-1.5"
        >
          {[
            { value: "", label: "Tất cả" },
            { value: "EXPENSE", label: "Tiền ra" },
            { value: "INCOME", label: "Tiền vào" },
          ].map((o) => {
            const active = o.value === shownType;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickType(o.value)}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-body transition-colors",
                  active
                    ? "bg-card font-bold text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {o.label}
                {pending && active && <Loader2 className="size-4 animate-spin" />}
              </button>
            );
          })}
        </div>

        {visible.length > 0 && (
          <Button
            variant="outline"
            size="default"
            className="shrink-0"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal />
            <span className="hidden sm:inline">Lọc theo loại</span>
          </Button>
        )}
      </div>

      {/* Chip cho biết đang lọc gì — bấm vào là bỏ lọc. */}
      {activeCategory && (
        <button
          type="button"
          onClick={() => setParams({ category: null })}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-surface px-4 text-label text-primary"
        >
          {activeCategory.icon ?? "📁"} {activeCategory.name}
          <X className="size-4" />
          <span className="sr-only">Bỏ lọc theo loại này</span>
        </button>
      )}

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉ xem một loại</DialogTitle>
            <DialogDescription>Chọn một loại để xem riêng những khoản thuộc loại đó.</DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60dvh] overflow-y-auto px-4 sm:mx-0 sm:px-0">
            <div className="divide-y divide-border overflow-hidden rounded-xl border-[1.5px] border-border">
              <SheetRow
                label="Xem tất cả các loại"
                active={!categoryId}
                onClick={() => {
                  setParams({ category: null });
                  setSheetOpen(false);
                }}
              />
              {visible.map((c) => (
                <SheetRow
                  key={c.id}
                  icon={c.icon ?? "📁"}
                  label={c.name}
                  active={c.id === categoryId}
                  onClick={() => {
                    setParams({ category: c.id });
                    setSheetOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SheetRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon?: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors",
        active ? "bg-primary-surface text-primary" : "hover:bg-sunken"
      )}
    >
      {icon && <span className="text-title">{icon}</span>}
      <span className="flex-1 truncate text-body-lg">{label}</span>
      {active && <Check className="size-5 shrink-0" />}
    </button>
  );
}
