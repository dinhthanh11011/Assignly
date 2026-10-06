"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChoiceGroup, CheckList } from "@/components/ui/choice-group";
import { SearchBox } from "@/components/search-box";
import { useNavTransition } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

export type CategoryFilterOption = { id: string; name: string; icon: string | null };

type Sort = "" | "nhieu" | "cu";
const SORTS: { value: Sort; label: string }[] = [
  { value: "", label: "Mới nhất" },
  { value: "nhieu", label: "Số tiền lớn nhất" },
  { value: "cu", label: "Cũ nhất" },
];

const chipClass =
  "focus-ring inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-primary-surface px-3.5 text-label text-primary transition-colors duration-150 hover:brightness-95";

/**
 * Thanh lọc của trang Sổ.
 *
 * - Hàng 1: ô tìm (ghi chú + tên loại) và nút "Lọc" — số trên nút là số điều
 *   kiện đang bật bên trong sheet (loại + cách sắp).
 * - Hàng 2: Tất cả / Chi / Thu — cố định, không cuộn, luôn đúng chỗ.
 * - Mọi điều kiện đang bật hiện thành chip bỏ được, kèm "Xoá lọc" bỏ hết — để
 *   "đang lọc" không bao giờ bị nhầm với "sổ chưa có gì".
 *
 * Sheet làm việc trên BẢN NHÁP: tick ba loại không phải ba lượt tải lại; chỉ nút
 * xác nhận mới ghi lên URL. Đóng bằng bất cứ cách nào là bỏ nháp.
 */
export function FilterBar({
  type,
  categoryIds,
  q,
  sort = "",
  categories,
}: {
  type: "INCOME" | "EXPENSE" | undefined;
  /** Các loại đang lọc. Rỗng = xem hết. */
  categoryIds: string[];
  /** Chữ đang tìm trong ghi chú và tên loại. */
  q?: string;
  /** `?sap=` hiện tại. */
  sort?: string;
  categories: CategoryFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<{ cats: string[]; sort: Sort } | null>(null);
  const [optimisticType, setOptimisticType] = useState<string | null>(null);

  const shownType = pending && optimisticType !== null ? optimisticType : (type ?? "");
  const currentSort: Sort = sort === "nhieu" || sort === "cu" ? sort : "";

  const setParams = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    // `scroll: false`: chỉ lọc lại danh sách đang xem, giữ nguyên chỗ cuộn.
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const pickType = (next: string) => {
    setOptimisticType(next);
    // Loại gắn với chi/thu — đổi chiều mà giữ loại là ra danh sách rỗng khó hiểu.
    setParams({ type: next || null, category: null });
  };

  // Chỉ giữ id có thật: `?category=` là chữ trên URL, id rác thành chip không nhãn.
  const picked = categoryIds.filter((id) => categories.some((c) => c.id === id));
  const activeCategories = categories.filter((c) => picked.includes(c.id));
  const sheetCount = picked.length + (currentSort ? 1 : 0);
  const activeCount = sheetCount + (type ? 1 : 0) + (q ? 1 : 0);

  const d = draft ?? { cats: picked, sort: currentSort };
  const dirty =
    d.sort !== currentSort ||
    d.cats.length !== picked.length ||
    d.cats.some((id) => !picked.includes(id));

  const openSheet = () => {
    // Nháp bắt đầu từ ĐÚNG thứ đang lọc — mở sheet không được là xoá lọc ngầm.
    setDraft({ cats: picked, sort: currentSort });
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setDraft(null);
    setSheetOpen(false);
  };
  const applyDraft = () => {
    if (dirty) setParams({ category: d.cats.join(",") || null, sap: d.sort || null });
    closeSheet();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <SearchBox
          value={q}
          label="Tìm khoản theo ghi chú hoặc tên loại"
          placeholder="Tìm ghi chú, loại…"
          className="min-w-0 flex-1"
        />
        <Button
          variant="outline"
          className="shrink-0 px-3.5"
          onClick={openSheet}
          aria-label={sheetCount > 0 ? `Lọc và sắp xếp, đang bật ${sheetCount}` : "Lọc và sắp xếp"}
        >
          <SlidersHorizontal aria-hidden />
          <span className="hidden @min-[24em]/app:inline">Lọc</span>
          {sheetCount > 0 && (
            <span
              aria-hidden
              className="num flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-caption font-bold text-primary-foreground"
            >
              {sheetCount}
            </span>
          )}
        </Button>
      </div>

      <ChoiceGroup
        label="Xem khoản chi hay khoản thu"
        value={shownType}
        onChange={pickType}
        options={[
          { value: "", label: "Tất cả" },
          { value: "EXPENSE", label: "Chi" },
          { value: "INCOME", label: "Thu" },
        ]}
        pending={pending}
        pendingLabel="Đang lọc danh sách"
      />

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Điều kiện đang lọc" role="group">
          {q && (
            <button type="button" onClick={() => setParams({ q: null })} className={chipClass}>
              <span className="truncate">Có chữ “{q}”</span>
              <X className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">— bỏ tìm kiếm</span>
            </button>
          )}
          {activeCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setParams({ category: picked.filter((id) => id !== c.id).join(",") || null })}
              className={chipClass}
            >
              <span aria-hidden>{c.icon ?? "📁"}</span>
              <span className="truncate">{c.name}</span>
              <X className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">— bỏ lọc loại này</span>
            </button>
          ))}
          {currentSort && (
            <button type="button" onClick={() => setParams({ sap: null })} className={chipClass}>
              <ArrowDownUp className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{SORTS.find((s) => s.value === currentSort)?.label}</span>
              <X className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">— về sắp mới nhất</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOptimisticType("");
              setParams({ q: null, type: null, category: null, sap: null });
            }}
            className="focus-ring inline-flex min-h-11 items-center rounded-lg px-3 text-label text-muted-foreground underline underline-offset-4 transition-colors duration-150 hover:text-foreground"
          >
            Xoá lọc ({activeCount})
          </button>
        </div>
      )}

      <Dialog open={sheetOpen} onOpenChange={(next) => (next ? openSheet() : closeSheet())}>
        <DialogContent className="overflow-y-hidden">
          <DialogHeader>
            <DialogTitle>Lọc và sắp xếp</DialogTitle>
            <DialogDescription>Chọn một hoặc nhiều loại, và cách xếp danh sách.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <div className="space-y-2">
              <p className="text-label text-foreground">Sắp xếp</p>
              <ChoiceGroup
                label="Sắp xếp danh sách"
                variant="chip"
                value={d.sort}
                onChange={(v) => setDraft({ ...d, sort: v })}
                options={SORTS}
              />
            </div>
            {categories.length > 0 && (
              <div className="space-y-2">
                <div className="flex min-h-11 items-center justify-between gap-2">
                  <p className="text-label text-foreground">
                    Loại {d.cats.length > 0 && <span className="text-muted-foreground">· đã chọn {d.cats.length}</span>}
                  </p>
                  {d.cats.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setDraft({ ...d, cats: [] })}>
                      Bỏ chọn hết
                    </Button>
                  )}
                </div>
                <CheckList
                  label="Chọn các loại muốn xem"
                  values={d.cats}
                  onToggle={(id, checked) =>
                    setDraft({ ...d, cats: checked ? [...d.cats, id] : d.cats.filter((c) => c !== id) })
                  }
                  options={categories.map((c) => ({ value: c.id, label: c.name, emoji: c.icon ?? "📁" }))}
                />
              </div>
            )}
          </DialogBody>
          <DialogFooter className={cn("flex-row gap-2 sm:flex-row")}>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={closeSheet}>
              Huỷ
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={applyDraft}>
              {d.cats.length === 0 ? "Xem tất cả loại" : `Xem ${d.cats.length} loại`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
