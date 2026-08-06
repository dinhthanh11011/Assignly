"use client";
import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { IconPicker } from "@/components/icon-picker";
import { ConfirmButton } from "@/components/confirm-dialog";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions";
import { cn } from "@/lib/utils";

export type CategoryRow = {
  id: string;
  name: string;
  icon: string | null;
  type: "INCOME" | "EXPENSE";
  count: number;
};

function CategorySection({
  groupId,
  type,
  rows,
}: {
  groupId: string;
  type: "INCOME" | "EXPENSE";
  rows: CategoryRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(type === "INCOME" ? "💰" : "📦");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [pending, start] = useTransition();

  function add() {
    if (!newName.trim()) return;
    start(async () => {
      try {
        await createCategory({ groupId, name: newName.trim(), type, icon: newIcon });
        toast.success("Đã thêm loại mới");
        setNewName("");
        setAdding(false);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function saveEdit(id: string) {
    if (!editName.trim()) return;
    start(async () => {
      try {
        await updateCategory(id, { name: editName.trim(), icon: editIcon });
        toast.success("Đã cập nhật");
        setEditingId(null);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Card>
      {/* flex-wrap: nút có whitespace-nowrap và tiêu đề thì không co được, nên ở
          cỡ chữ lớn (fs-lg/fs-xl — chữ to lên còn màn hình thì không) tổng bề
          rộng tối thiểu của hàng này vượt màn hình và đẩy cả thẻ tràn ra ngoài.
          Cho nút rơi xuống dòng dưới thay vì bị cắt mất một nửa. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-4">
        <h2 className="flex min-w-0 items-center gap-2 text-body font-semibold">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              type === "EXPENSE" ? "bg-expense" : "bg-income"
            )}
          />
          <span className="truncate">
            {type === "EXPENSE" ? "Loại tiền ra" : "Loại tiền vào"}
          </span>
          <span className="shrink-0 text-caption font-normal text-muted-foreground">
            ({rows.length})
          </span>
        </h2>
        <Button variant="soft" size="sm" className="shrink-0" onClick={() => setAdding((v) => !v)}>
          <Plus /> Thêm loại
        </Button>
      </div>

      <CardContent className="space-y-1.5 pt-0">
        {adding && (
          <div className="space-y-2 rounded-lg bg-sunken p-3">
            <div className="flex gap-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-title">
                {newIcon}
              </span>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={type === "EXPENSE" ? "VD: Ăn uống" : "VD: Lương"}
                autoFocus
                className="bg-card"
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              <Button size="icon" disabled={pending} onClick={add} aria-label="Lưu">
                <Check />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setAdding(false)} aria-label="Huỷ">
                <X />
              </Button>
            </div>
            <IconPicker value={newIcon} onChange={setNewIcon} />
          </div>
        )}

        {rows.length === 0 && !adding ? (
          <p className="py-8 text-center text-body text-muted-foreground">Chưa có loại nào. Bấm “Thêm loại” để tạo.</p>
        ) : (
          rows.map((row) =>
            editingId === row.id ? (
              <div key={row.id} className="space-y-2 rounded-lg bg-sunken p-3">
                <div className="flex gap-2">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-title">
                    {editIcon || "📁"}
                  </span>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="bg-card"
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(row.id)}
                  />
                  <Button
                    size="icon"
                    disabled={pending}
                    onClick={() => saveEdit(row.id)}
                    aria-label="Lưu"
                  >
                    <Check />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    aria-label="Huỷ"
                  >
                    <X />
                  </Button>
                </div>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </div>
            ) : (
              <div
                key={row.id}
                className="group flex min-h-14 items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-sunken"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-body group-hover:bg-card">
                  {row.icon ?? "📁"}
                </span>
                {/* "N khoản" xuống dòng dưới, không đứng cùng hàng ngang: nó là
                    một cụm shrink-0 nữa bên cạnh hai nút icon shrink-0, và ở cỡ
                    chữ lớn thì bốn cụm cứng đó cộng lại rộng hơn màn hình →
                    thẻ tràn ngang. Xếp dọc cũng là dáng hàng chung của app. */}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-lg">{row.name}</span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {row.count} khoản
                  </span>
                </span>
                {/* Luôn hiện. Bản cũ là opacity-0 tới khi hover — trên điện
                    thoại không có hover, nghĩa là hai nút này không tồn tại. */}
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Sửa loại ${row.name}`}
                    onClick={() => {
                      setEditingId(row.id);
                      setEditName(row.name);
                      setEditIcon(row.icon ?? "");
                    }}
                  >
                    <Pencil />
                  </Button>
                  <ConfirmButton
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Xoá loại ${row.name}`}
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
                    onConfirm={() => deleteCategory(row.id)}
                  >
                    <Trash2 />
                  </ConfirmButton>
                </div>
              </div>
            )
          )
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryManager({
  groupId,
  categories,
}: {
  groupId: string;
  categories: CategoryRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <CategorySection
        groupId={groupId}
        type="EXPENSE"
        rows={categories.filter((c) => c.type === "EXPENSE")}
      />
      <CategorySection
        groupId={groupId}
        type="INCOME"
        rows={categories.filter((c) => c.type === "INCOME")}
      />
    </div>
  );
}
