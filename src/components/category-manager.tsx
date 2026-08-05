"use client";
import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { IconPicker } from "@/components/icon-picker";
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
        toast.success("Đã thêm danh mục");
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

  function remove(row: CategoryRow) {
    start(async () => {
      try {
        await deleteCategory(row.id);
        toast.success(
          row.count > 0
            ? `Đã xoá — ${row.count} giao dịch chuyển sang “Chưa phân loại”`
            : "Đã xoá danh mục"
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-4">
        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight">
          <span
            className={cn(
              "size-2 rounded-full",
              type === "EXPENSE" ? "bg-expense" : "bg-income"
            )}
          />
          {type === "EXPENSE" ? "Danh mục chi" : "Danh mục thu"}
          <span className="text-xs font-normal text-muted-foreground">({rows.length})</span>
        </h2>
        <Button variant="soft" size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-4" /> Thêm
        </Button>
      </div>

      <CardContent className="space-y-1.5 pt-0">
        {adding && (
          <div className="space-y-2 rounded-lg bg-sunken p-3">
            <div className="flex gap-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-card text-lg shadow-soft">
                {newIcon}
              </span>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên danh mục"
                autoFocus
                className="bg-card"
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              <Button size="icon" disabled={pending} onClick={add} aria-label="Lưu">
                <Check className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setAdding(false)} aria-label="Huỷ">
                <X className="size-4" />
              </Button>
            </div>
            <IconPicker value={newIcon} onChange={setNewIcon} />
          </div>
        )}

        {rows.length === 0 && !adding ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chưa có danh mục nào.</p>
        ) : (
          rows.map((row) =>
            editingId === row.id ? (
              <div key={row.id} className="space-y-2 rounded-lg bg-sunken p-3">
                <div className="flex gap-2">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-card text-lg shadow-soft">
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
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    aria-label="Huỷ"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </div>
            ) : (
              <div
                key={row.id}
                className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-sunken"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-base group-hover:bg-card">
                  {row.icon ?? "📁"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{row.count} GD</span>
                <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Sửa ${row.name}`}
                    onClick={() => {
                      setEditingId(row.id);
                      setEditName(row.name);
                      setEditIcon(row.icon ?? "");
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Xoá ${row.name}`}
                    disabled={pending}
                    onClick={() => remove(row)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
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
    <div className="grid gap-5 lg:grid-cols-2">
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
