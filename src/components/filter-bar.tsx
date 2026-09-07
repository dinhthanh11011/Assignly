"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChoiceGroup, CheckList } from "@/components/ui/choice-group";
import { SearchBox } from "@/components/search-box";
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
 * Phần đuôi dài (chọn loại) chuyển vào một sheet danh sách dọc, chọn được
 * NHIỀU loại cùng lúc — "ăn uống hoặc đi lại" là câu hỏi người ta hỏi thật, và
 * bản cũ chỉ cho một loại buộc họ phải xem hai lần rồi tự cộng trong đầu. Sheet
 * làm việc trên một bản nháp, chỉ nút xác nhận mới lọc lại (xem `draft`).
 * Bộ lọc đang bật hiện thành chip xoá được ngay bên dưới (mỗi loại một chip),
 * để trạng thái "đang lọc" không bao giờ bị nhầm với "sổ chưa có gì".
 */
export function FilterBar({
  type,
  categoryIds,
  q,
  categories,
}: {
  type: "INCOME" | "EXPENSE" | undefined;
  /** Các loại đang lọc. Rỗng = xem hết. */
  categoryIds: string[];
  /** Chữ đang tìm trong ghi chú. */
  q?: string;
  categories: CategoryFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useNavTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  /**
   * Bản nháp của sheet chọn loại. `null` = sheet đang đóng / chưa sửa gì.
   *
   * Tick trong sheet KHÔNG lọc lại ngay: chọn ba loại là ba lượt gọi server và
   * ba lần danh sách dưới sheet nhảy số, trong đó hai lần đầu là trạng thái
   * người dùng chưa hề muốn xem. Chỉ nút xác nhận mới ghi lên URL.
   */
  const [draft, setDraft] = useState<string[] | null>(null);
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
    // `scroll: false`: điều hướng ở đây chỉ để lọc lại danh sách đang xem, giữ
    // nguyên chỗ cuộn — xem search-box.tsx.
    startTransition(() =>
      opts?.replace
        ? router.replace(url, { scroll: false })
        : router.push(url, { scroll: false })
    );
  };

  const pickType = (next: string) => {
    setOptimisticType(next);
    // Đổi chiều thì bỏ luôn loại đang chọn: loại có phân chi/thu, giữ lại sẽ ra
    // danh sách rỗng mà người dùng không hiểu vì sao.
    setParams({ type: next || null, category: null });
  };

  // Chỉ giữ id có thật trong danh sách loại đang xem: `?category=` là chữ trên
  // URL, và một id rác ở đây sẽ thành chip không nhãn không bỏ được.
  const picked = categoryIds.filter((id) => categories.some((c) => c.id === id));
  const activeCategories = categories.filter((c) => picked.includes(c.id));

  /** Cái sheet đang hiện: bản nháp nếu có, còn lại là đúng thứ đang lọc. */
  const draftPicked = draft ?? picked;
  const dirty =
    draftPicked.length !== picked.length ||
    draftPicked.some((id) => !picked.includes(id));

  const openSheet = () => {
    // Nháp bắt đầu từ ĐÚNG thứ đang lọc, không phải từ rỗng: mở sheet ra không
    // được là một lệnh xoá bộ lọc ngầm.
    setDraft(picked);
    setSheetOpen(true);
  };

  // Đóng bằng bất cứ cách nào (nút Huỷ, dấu X, gạt xuống, Esc) là BỎ bản nháp.
  // Một nháp còn sống sau khi sheet đóng sẽ hiện lại ở lần mở sau như thể đã
  // lọc rồi, trong khi danh sách thì không.
  const closeSheet = () => {
    setDraft(null);
    setSheetOpen(false);
  };

  const toggleDraft = (id: string, checked: boolean) => {
    setDraft((prev) => {
      const base = prev ?? picked;
      return checked ? [...base, id] : base.filter((c) => c !== id);
    });
  };

  const applyDraft = () => {
    // Không sửa gì thì đóng suông: một lượt điều hướng chỉ để ghi lại đúng cái
    // URL đang có là thêm một entry vào history và một lượt chờ server.
    if (dirty) setParams({ category: draftPicked.join(",") || null });
    closeSheet();
  };

  return (
    <div className="space-y-2">
      {/* Ô tìm kiếm dùng chung với trang Nợ — xem search-box.tsx. */}
      <SearchBox value={q} label="Tìm trong ghi chú các khoản" placeholder="Tìm trong ghi chú…" />

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
            onClick={openSheet}
          >
            <SlidersHorizontal />
            <span className="hidden sm:inline">Lọc theo loại</span>
            {/* Số loại đang lọc hiện ngay trên nút: nút đóng lại thì mấy chip
                bên dưới là chỗ duy nhất nói điều đó, mà chúng ở xa mắt hơn. */}
            {picked.length > 0 && (
              <span className="rounded-full bg-primary px-2 text-caption font-bold text-primary-foreground">
                {picked.length}
                <span className="sr-only"> loại đang lọc</span>
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Chip cho biết đang lọc gì — bấm vào là bỏ lọc. */}
      {(activeCategories.length > 0 || q) && (
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
          {activeCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                setParams({
                  category: picked.filter((id) => id !== c.id).join(",") || null,
                })
              }
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-surface px-4 text-label text-primary"
            >
              {c.icon ?? "📁"} {c.name}
              <X className="size-4" aria-hidden />
              <span className="sr-only">Bỏ lọc theo loại {c.name}</span>
            </button>
          ))}
          {/* "Bỏ hết" chỉ xuất hiện từ loại thứ hai: với một chip thì chính nó
              đã là nút bỏ, thêm nút nữa là hai cách làm cùng một việc. */}
          {activeCategories.length > 1 && (
            <button
              type="button"
              onClick={() => setParams({ category: null })}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-label text-muted-foreground underline hover:text-foreground"
            >
              Bỏ hết lọc theo loại
            </button>
          )}
        </div>
      )}

      <Dialog open={sheetOpen} onOpenChange={(next) => (next ? openSheet() : closeSheet())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xem theo loại</DialogTitle>
            <DialogDescription>
              Chọn một hoặc nhiều loại. Khoản nào thuộc loại đã chọn thì hiện.
            </DialogDescription>
          </DialogHeader>
          {/* "Bỏ chọn hết" là một NÚT riêng, KHÔNG phải một mục trong danh
              sách hộp kiểm (bản một-loại trước đây có hàng "Xem tất cả các
              loại" nằm chung): nó không phải một loại để tick cùng những loại
              khác — tick nó cùng "Lương" thì đọc ra thành "tất cả + Lương",
              vô nghĩa. */}
          <div className="-mx-4 max-h-[60dvh] space-y-2 overflow-y-auto px-4 sm:mx-0 sm:px-0">
            {draftPicked.length > 0 && (
              <Button variant="outline" className="w-full" onClick={() => setDraft([])}>
                Bỏ chọn hết
              </Button>
            )}
            <CheckList
              label="Chọn các loại muốn xem"
              values={draftPicked}
              onToggle={toggleDraft}
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
                emoji: c.icon ?? "📁",
              }))}
            />
          </div>
          {/* Nút xác nhận nói luôn nó sắp làm gì: "Xem 3 loại đã chọn" / "Xem
              tất cả các loại". Một chữ "Xong" trần không cho biết mấy ô vừa
              tick sẽ thành cái gì, mà đây đúng là chỗ duy nhất người dùng xác
              nhận. Kèm nút Huỷ vì bỏ nháp phải có đường đi thấy được, không chỉ
              trông vào dấu X ở góc. */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={closeSheet}>
              Huỷ
            </Button>
            <Button className="flex-1" onClick={applyDraft}>
              {draftPicked.length === 0
                ? "Xem tất cả các loại"
                : `Xem ${draftPicked.length} loại đã chọn`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
