import { NotebookText } from "lucide-react";

/** Nhắc rõ đang ghi vào sổ nào — người dùng nhiều sổ rất dễ ghi lẫn. */
export function GroupBadge({ groupName }: { groupName: string }) {
  return (
    <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-primary-surface px-2.5 py-1 text-caption font-semibold text-primary">
      <NotebookText className="size-3.5 shrink-0" />
      <span className="truncate">Ghi vào sổ {groupName}</span>
    </span>
  );
}
