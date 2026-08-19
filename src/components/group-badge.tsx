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
    /* items-start + xuống dòng, không `truncate`: ở màn hẹp × cỡ chữ lớn viên
       này chỉ còn chỗ cho "Ghi vào sổ Sổ …", tức nó nhắc đang ghi vào sổ nào mà
       lại giấu mất tên sổ — đúng thứ duy nhất nó tồn tại để nói. Viên cao thêm
       một dòng thì không hỏng gì. */
    <Badge className="w-fit max-w-full items-start">
      <NotebookText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>Ghi vào sổ {groupName}</span>
    </Badge>
  );
}
