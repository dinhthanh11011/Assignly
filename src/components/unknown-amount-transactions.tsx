import { CircleHelp } from "lucide-react";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { type CategoryOption } from "@/components/transaction-dialog";
import { type MemberOption } from "@/lib/member";

/**
 * KHOẢN CHƯA ĐIỀN SỐ TIỀN — khối nhắc việc ở đầu trang chủ.
 *
 * Cả tính năng "ghi trước khi biết số tiền" đứng hay sụp ở đúng khối này. Ghi lại
 * để không quên chỉ có nghĩa nếu về sau có cái gì đó NHẮC; không có nó thì khoản
 * chưa rõ trôi xuống theo ngày như mọi khoản khác, và một tuần sau nó nằm ở đâu
 * đó giữa danh sách với chữ "Chưa rõ" mà không ai còn cuộn tới. Người dùng vừa
 * mất tiền vừa mất niềm tin vào sổ — tệ hơn hẳn so với không ghi gì.
 *
 * KHÔNG theo bộ lọc tháng/loại/tìm kiếm của trang, cùng lý do với khối "chờ gửi"
 * ngay dưới nó: một việc còn dở là việc của cả cuốn sổ. Lọc nó theo tháng thì lật
 * sang tháng khác là cái nhắc biến mất — đúng lúc nó cần thiết nhất.
 *
 * Danh sách bên trong là CHÍNH `TransactionList`, không phải một hàng tự vẽ lại:
 * bấm vào là ra cùng một sheet chi tiết, cùng đường sửa/xoá/điền tiền. Mấy khoản
 * này cũng vẫn nằm trong danh sách chính theo đúng ngày của chúng — nhân đôi chỗ
 * hiện là CÓ Ý: ở trên là "còn việc phải làm", ở dưới là "hôm đó có những gì", và
 * cả hai câu đó đều đúng.
 */
export function UnknownAmountTransactions({
  groupId,
  categories,
  members,
  currentUserId,
  items,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  items: TransactionItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Khoản chưa điền số tiền"
      className="space-y-3 rounded-xl border border-warning bg-card p-3.5"
    >
      <div className="flex items-start gap-2">
        <CircleHelp aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-label text-warning">
            {items.length === 1
              ? "1 khoản chưa điền số tiền"
              : `${items.length} khoản chưa điền số tiền`}
          </p>
          {/* Câu này phải nói ra HAI điều, vì thiếu điều nào người dùng cũng hiểu
              sai khối này: các khoản đó chưa được cộng vào tổng nào (nên sổ vẫn
              đúng), và việc cần làm là bấm vào để điền. */}
          <p className="text-caption text-muted-foreground">
            Chưa được cộng vào tổng thu chi. Bấm vào khoản để điền số tiền khi bạn đã
            biết.
          </p>
        </div>
      </div>

      {/* grouped={false}: gom theo ngày ở đây là vô nghĩa — mấy khoản này rải rác
          nhiều tháng, và mỗi tiêu đề ngày lại kèm một tổng ngày SAI (chúng chưa có
          số tiền nào để cộng). Bố cục phẳng đưa ngày xuống từng hàng.
          nextCursor={null}: khối nhắc việc không phân trang, xem giới hạn ở
          `getUnknownAmountTransactions`. */}
      <TransactionList
        groupId={groupId}
        categories={categories}
        members={members}
        currentUserId={currentUserId}
        items={items}
        nextCursor={null}
        filter={{}}
        grouped={false}
        announceCount={false}
      />
    </section>
  );
}
