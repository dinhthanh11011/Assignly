import { NotebookText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Nhắc rõ đang ghi vào sổ nào — người dùng nhiều sổ rất dễ ghi lẫn.
 *
 * Trước đây đây là một chuỗi class chép nguyên xi từ badgeVariants (biến thể
 * mặc định), lệch đúng một bậc chữ. Một bậc chữ không đáng để app có hai bản
 * Badge sống song song.
 */
export function GroupBadge({ groupName }: { groupName: string }) {
  return (
    <Badge className="w-fit max-w-full">
      <NotebookText className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">Ghi vào sổ {groupName}</span>
    </Badge>
  );
}
