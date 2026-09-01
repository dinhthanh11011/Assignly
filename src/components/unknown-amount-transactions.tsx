import { CircleHelp } from "lucide-react";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { type CategoryOption } from "@/components/transaction-dialog";
import { type MemberOption } from "@/lib/member";
import { formatMonth } from "@/lib/utils";

/**
 * KHOẢN CHƯA ĐIỀN SỐ TIỀN — khối nhắc việc ở đầu trang chủ.
 *
 * Cả tính năng "ghi trước khi biết số tiền" đứng hay sụp ở đúng khối này. Ghi lại
 * để không quên chỉ có nghĩa nếu về sau có cái gì đó NHẮC; không có nó thì khoản
 * chưa rõ trôi xuống theo ngày như mọi khoản khác, và một tuần sau nó nằm ở đâu
 * đó giữa danh sách với chữ "Chưa rõ" mà không ai còn cuộn tới.
 *
 * Đi THEO THÁNG đang xem — khác hẳn khối "chờ gửi" ngay dưới nó, và đây là lựa
 * chọn có ý: mở tháng nào thì nhắc việc còn dở của tháng đó, để cái nhắc luôn nói
 * về đúng khoảng thời gian đang bày trên màn hình thay vì trộn mọi tháng vào một
 * chỗ. Đổi lại, lật sang tháng khác là nhắc của tháng cũ biến mất, nên tiêu đề
 * phải NÓI RÕ đang đếm trong tháng nào; ở chế độ tìm xuyên tháng (`month`
 * = null) thì đếm cả sổ. Khối "chờ gửi" vẫn không theo tháng vì khoản chờ gửi
 * chưa vào CSDL, chưa thuộc tháng nào cả.
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
  month,
}: {
  groupId: string;
  categories: CategoryOption[];
  members: MemberOption[];
  currentUserId: string;
  items: TransactionItem[];
  /** Tháng đang xem ("2026-03"), hoặc null khi đang tìm xuyên mọi tháng. */
  month: string | null;
}) {
  if (items.length === 0) return null;

  // Không có tháng thì đang xem cả sổ, đừng bịa ra một khoảng thời gian.
  const scope = month ? ` trong ${formatMonth(month).toLowerCase()}` : "";

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
              ? `1 khoản chưa điền số tiền${scope}`
              : `${items.length} khoản chưa điền số tiền${scope}`}
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

      {/* grouped={false}: mỗi tiêu đề ngày lại kèm một tổng ngày SAI (mấy khoản này
          chưa có số tiền nào để cộng), mà danh sách chính ngay dưới đã gom theo ngày
          rồi. Bố cục phẳng đưa ngày xuống từng hàng.
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
