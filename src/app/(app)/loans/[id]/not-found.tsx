import Link from "next/link";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";

/**
 * Câu mô tả cố ý nêu HAI nguyên nhân: `getLoanDetail` trả về null cho cả "dòng
 * đã bị xoá" lẫn "bạn không còn là thành viên của sổ chứa nó", và từ đây không
 * phân biệt được. Nói mỗi một nguyên nhân là nói sai một nửa số trường hợp.
 *
 * Đích ghi rõ `?view=loans`: sổ có nhiều người mặc định mở tab "Tiền chung", nên
 * quay về `/loans` trần sẽ hạ cánh vào đúng tab KHÔNG chứa khoản vừa tìm.
 */
export default function LoanNotFound() {
  return (
    <MessageScreen
      icon={Handshake}
      title="Không tìm thấy khoản mượn này"
      actions={
        <Button asChild size="lg">
          <Link href="/loans?view=loans">Về trang Nợ</Link>
        </Button>
      }
    >
      Khoản mượn này có thể đã bị xoá, hoặc nó thuộc một sổ mà bạn không còn ở trong.
    </MessageScreen>
  );
}
