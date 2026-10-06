import { NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Nhắc rõ đang ghi vào sổ nào — người dùng nhiều sổ rất dễ ghi lẫn.
 *
 * Xuống dòng chứ không `truncate`: ở màn hẹp × chữ lớn, cắt bằng "…" là giấu
 * đúng cái tên sổ mà chip này tồn tại để nói.
 */
export function GroupBadge({ groupName }: { groupName: string }) {
  return (
    <Badge className="w-fit items-start">
      <NotebookPen className="mt-0.5" aria-hidden />
      <span className="min-w-0 break-words">Ghi vào sổ {groupName}</span>
    </Badge>
  );
}
