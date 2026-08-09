"use client";
import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { useNavTransition } from "@/components/nav-progress";

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
  q,
  categories,
}: {
  type: "INCOME" | "EXPENSE" | undefined;
  categoryId: string | undefined;
  /** Chữ đang tìm trong ghi chú. */
  q?: string;
  categories: CategoryFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [optimisticType, setOptimisticType] = useState<string | null>(null);

  const shownType = pending && optimisticType !== null ? optimisticType : (type ?? "");

  const setParams = (
    updates: Record<string, string | null>,
    opts?: { replace?: boolean }
  ) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => (opts?.replace ? router.replace(url) : router.push(url)));
  };

  const pickType = (next: string) => {
    setOptimisticType(next);
    // Đổi chiều thì bỏ luôn loại đang chọn: loại có phân chi/thu, giữ lại sẽ ra
    // danh sách rỗng mà người dùng không hiểu vì sao.
    setParams({ type: next || null, category: null });
  };

  const activeCategory = categories.find((c) => c.id === categoryId);

  /* Ô tìm kiếm.
     Phần server của tính năng này đã hoàn chỉnh từ lâu — `q` lọc theo ghi chú
     trong queries.ts và đi xuyên cả phân trang — nhưng KHÔNG có ô nhập nào để
     đặt nó, nên nó là code chết. Đây là phần còn thiếu.

     Vì sao là searchParams + điều hướng chứ không phải state ở client: nút "Tải
     thêm" gửi NGUYÊN bộ lọc ngược về server, nên nếu `q` chỉ sống ở client thì
     trang 2 lọc theo một điều kiện khác trang 1. Ngoài ra URL còn chia sẻ được,
     nút Back hoạt động, và thanh tiến trình sẵn có tự chạy. */
  const [draft, setDraft] = useState(q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Người dùng bấm chip "xoá tìm kiếm" hay bấm Back → ô nhập phải theo URL.
  // Chỉnh state NGAY TRONG LÚC RENDER thay vì trong useEffect: React tự vẽ lại
  // trước khi kịp hiện gì lên màn, nên không có nhịp nháy nào — còn effect thì
  // vẽ giá trị cũ trước rồi mới sửa. Đây là pattern chính thức của React cho
  // "state cần theo prop" (You Might Not Need an Effect).
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setDraft(q ?? "");
  }

  const commitSearch = (next: string) => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = next.trim();
    // Dưới 2 ký tự thì bỏ qua: một ký tự quét gần hết bảng mà chẳng thu hẹp gì.
    // Chuỗi rỗng là ngoại lệ — đó là "bỏ tìm", phải ăn ngay.
    if (trimmed.length === 1) return;
    // replace chứ không push: nếu không, mỗi phím gõ thành một mục trong lịch
    // sử và người dùng phải bấm Back mười lần để về chỗ cũ.
    setParams({ q: trimmed || null }, { replace: true });
  };

  const onSearchChange = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commitSearch(next), 400);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Tìm trong ghi chú các khoản"
          placeholder="Tìm trong ghi chú…"
          value={draft}
          onChange={(e) => onSearchChange(e.target.value)}
          onBlur={() => commitSearch(draft)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            commitSearch(draft);
          }}
          className="px-11"
        />
        {draft && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              commitSearch("");
            }}
            aria-label="Xoá chữ đang tìm"
            className="focus-ring absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <ChoiceGroup
          label="Xem tiền vào hay tiền ra"
          value={shownType}
          onChange={pickType}
          options={[
            { value: "", label: "Tất cả" },
            { value: "EXPENSE", label: "Tiền ra" },
            { value: "INCOME", label: "Tiền vào" },
          ]}
          pending={pending}
          pendingLabel="Đang lọc danh sách"
          className="flex-1"
        />

        {categories.length > 0 && (
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
      {(activeCategory || q) && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <button
              type="button"
              onClick={() => setParams({ q: null })}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-surface px-4 text-label text-primary"
            >
              Có chữ “{q}”
              <X className="size-4" aria-hidden />
              <span className="sr-only">Bỏ tìm kiếm</span>
            </button>
          )}
          {activeCategory && (
            <button
              type="button"
              onClick={() => setParams({ category: null })}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-surface px-4 text-label text-primary"
            >
              {activeCategory.icon ?? "📁"} {activeCategory.name}
              <X className="size-4" />
              <span className="sr-only">Bỏ lọc theo loại này</span>
            </button>
          )}
        </div>
      )}

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉ xem một loại</DialogTitle>
            <DialogDescription>Chọn một loại để xem riêng những khoản thuộc loại đó.</DialogDescription>
          </DialogHeader>
          <div className="-mx-4 max-h-[60dvh] overflow-y-auto px-4 sm:mx-0 sm:px-0">
            <ChoiceGroup
              label="Chọn loại để xem riêng"
              variant="list"
              value={categoryId ?? ""}
              onChange={(next) => {
                setParams({ category: next || null });
                setSheetOpen(false);
              }}
              options={[
                { value: "", label: "Xem tất cả các loại" },
                ...categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  emoji: c.icon ?? "📁",
                })),
              ]}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
