"use client";
import { call } from "@/lib/action-result";
import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/field";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPicker } from "@/components/icon-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions";

export type CategoryRow = {
  id: string;
  name: string;
  icon: string | null;
  type: "INCOME" | "EXPENSE";
  count: number;
};

type Kind = "EXPENSE" | "INCOME";

/** Emoji của loại là dữ liệu người dùng — luôn nằm trong một ô vuông đồng cỡ. */
function EmojiTile({ icon, size = "md" }: { icon: string | null; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={
        size === "lg"
          ? "flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-sunken text-page leading-none"
          : "flex size-11 shrink-0 items-center justify-center rounded-lg bg-sunken text-title leading-none"
      }
    >
      {icon || "📁"}
    </span>
  );
}

/**
 * Các loại thu chi của sổ đang mở: hai tab Chi / Thu, mỗi loại là một ô bấm
 * vào để sửa (tên + emoji trong hộp thoại), xoá nằm trong hộp thoại đó và có
 * bước xác nhận nói rõ các khoản đang thuộc loại sẽ đi đâu.
 */
export function CategoryManager({
  groupId,
  categories,
}: {
  groupId: string;
  categories: CategoryRow[];
}) {
  const [tab, setTab] = useState<Kind>("EXPENSE");
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const rows = categories.filter((c) => c.type === tab);
  const counts = {
    EXPENSE: categories.filter((c) => c.type === "EXPENSE").length,
    INCOME: categories.filter((c) => c.type === "INCOME").length,
  };
  const noun = tab === "EXPENSE" ? "tiền ra" : "tiền vào";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ChoiceGroup<Kind>
          label="Loại tiền"
          value={tab}
          onChange={setTab}
          className="min-w-0 flex-[1_1_16rem]"
          options={[
            {
              value: "EXPENSE",
              label: `Chi (${counts.EXPENSE})`,
              icon: ArrowUpRight,
              tone: "expense",
            },
            {
              value: "INCOME",
              label: `Thu (${counts.INCOME})`,
              icon: ArrowDownLeft,
              tone: "income",
            },
          ]}
        />
        <Button onClick={() => setEditing("new")} className="flex-[0_0_auto]">
          <Plus /> Thêm loại {noun}
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={`Chưa có loại ${noun} nào`}
          action={
            <Button variant="outline" onClick={() => setEditing("new")}>
              <Plus /> Thêm loại đầu tiên
            </Button>
          }
        >
          {tab === "EXPENSE"
            ? "Ví dụ: Ăn uống, Xăng xe, Điện nước — để biết tiền đi vào những việc gì."
            : "Ví dụ: Lương, Thưởng, Bán hàng — để biết tiền đến từ đâu."}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id} className="min-w-0">
              <button
                type="button"
                onClick={() => setEditing(row)}
                aria-label={`Sửa loại ${row.name}`}
                className="focus-ring flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunken"
              >
                <EmojiTile icon={row.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-lg">{row.name}</span>
                  <span className="block text-caption text-muted-foreground">
                    {row.count > 0 ? `${row.count} khoản` : "Chưa dùng"}
                  </span>
                </span>
                <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <CategoryDialog
        key={editing === "new" ? `new-${tab}` : (editing?.id ?? "closed")}
        groupId={groupId}
        type={tab}
        row={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function CategoryDialog({
  groupId,
  type,
  row,
  open,
  onClose,
}: {
  groupId: string;
  type: Kind;
  /** null = thêm mới. */
  row: CategoryRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const kind = row?.type ?? type;
  const [name, setName] = useState(row?.name ?? "");
  const [icon, setIcon] = useState(row?.icon ?? (kind === "INCOME" ? "💰" : "📦"));
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const noun = kind === "EXPENSE" ? "tiền ra" : "tiền vào";

  function save() {
    // Chặn bấm/Enter lần hai khi lần đầu chưa xong — hai lời gọi song song đều
    // qua bước kiểm trùng tên ở server và cái sau đâm vào unique index.
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Đặt tên cho loại, ví dụ “Ăn uống”");
      document.getElementById("category-name")?.focus();
      return;
    }
    start(async () => {
      try {
        if (row) {
          await call(updateCategory(row.id, { name: trimmed, icon }));
          toast.success("Đã lưu loại");
        } else {
          await call(createCategory({ groupId, name: trimmed, type: kind, icon }));
          toast.success(`Đã thêm loại “${trimmed}”`);
        }
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <>
      <Dialog open={open && !confirmDelete} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{row ? "Sửa loại" : `Thêm loại ${noun}`}</DialogTitle>
            <DialogDescription>
              {row
                ? row.count > 0
                  ? `${row.count} khoản đang thuộc loại này sẽ đổi theo.`
                  : "Loại này chưa có khoản nào."
                : "Chọn một biểu tượng và đặt tên ngắn, dễ nhận ra."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-5"
            >
              <div className="flex items-end gap-3">
                <EmojiTile icon={icon} size="lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="category-name">Tên loại</Label>
                  <Input
                    id="category-name"
                    value={name}
                    autoFocus
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    placeholder={kind === "EXPENSE" ? "VD: Ăn uống" : "VD: Lương"}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={error ? "category-name-error" : undefined}
                  />
                </div>
              </div>
              <FieldError id="category-name-error">{error}</FieldError>
              <div className="space-y-2">
                <p className="text-label text-muted-foreground">Biểu tượng</p>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              {/* Nút submit ẩn để Enter trong ô tên lưu luôn. */}
              <button type="submit" hidden aria-hidden tabIndex={-1} />
            </form>
          </DialogBody>
          <DialogFooter className="sm:justify-between">
            {row ? (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
              >
                <Trash2 /> Xoá loại
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Thôi
              </Button>
              <Button onClick={save} loading={pending}>
                {row ? "Lưu" : "Thêm loại"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {row && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={(v) => {
            setConfirmDelete(v);
          }}
          title={`Xoá loại “${row.name}”?`}
          description={
            row.count > 0
              ? `${row.count} khoản đang thuộc loại này sẽ chuyển sang “Chưa ghi là gì”. Tiền của các khoản đó không mất.`
              : "Loại này chưa có khoản nào, xoá đi không ảnh hưởng gì."
          }
          confirmLabel="Xoá loại này"
          successMessage={
            row.count > 0
              ? `Đã xoá — ${row.count} khoản chuyển sang “Chưa ghi là gì”`
              : "Đã xoá loại này"
          }
          onConfirm={() => call(deleteCategory(row.id))}
          onDone={onClose}
        />
      )}
    </>
  );
}
