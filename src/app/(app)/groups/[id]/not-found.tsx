import Link from "next/link";
import { Notebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

/**
 * Hai nguyên nhân, cùng lý do như trang nợ: `getGroupDetail` không phân biệt
 * được "sổ đã bị xoá" với "bạn đã rời sổ / bị mời ra".
 */
export default function GroupNotFound() {
  return (
    <MessageScreen
      icon={Notebook}
      title="Không tìm thấy sổ này"
      actions={
        <Button asChild size="lg">
          <Link href="/groups">Về Sổ của tôi</Link>
        </Button>
      }
    >
      Sổ này có thể đã bị xoá, hoặc bạn đã rời khỏi nó.
    </MessageScreen>
  );
}
