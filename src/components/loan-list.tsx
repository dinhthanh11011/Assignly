import { AlertTriangle } from "lucide-react";
import { LoanCard, type LoanCardData } from "@/components/loan-card";
import { loanDirectionHeading } from "@/lib/copy";

type Loan = LoanCardData & { paymentCount: number };

/**
 * Danh sách khoản mượn, chia theo CHIỀU thành hai mục có tiêu đề.
 *
 * Bản cũ để chiều (cho vay / đi vay) làm một hàng chip lọc. Nhưng chiều là sự
 * thật quan trọng nhất của một khoản nợ — "ai nợ ai" chính là câu hỏi người
 * dùng mở trang này để trả lời — nên nó phải là TIÊU ĐỀ, thứ luôn nhìn thấy,
 * chứ không phải cái chip mà bạn có thể quên là mình đang bật.
 *
 * "Cần nhắc" cũng thôi làm bộ lọc: nó thành một mục ghim ở đầu. Ba hàng chip
 * chồng nhau của bản cũ (cần chú ý / chiều / trạng thái) rút còn đúng một hàng
 * trạng thái, mà mọi tổ hợp vẫn tới được.
 */
export function LoanList({ loans, attention }: { loans: Loan[]; attention: Loan[] }) {
  const lend = loans.filter((l) => l.type === "LEND");
  const borrow = loans.filter((l) => l.type === "BORROW");

  return (
    <div className="space-y-6">
      {attention.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 px-1 text-label text-warning">
            <AlertTriangle className="size-5 shrink-0" />
            Cần nhắc ({attention.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {attention.slice(0, 4).map((loan) => (
              <LoanCard key={loan.id} loan={loan} paymentCount={loan.paymentCount} />
            ))}
          </div>
        </section>
      )}

      <DirectionSection type="LEND" loans={lend} />
      <DirectionSection type="BORROW" loans={borrow} />
    </div>
  );
}

function DirectionSection({ type, loans }: { type: "LEND" | "BORROW"; loans: Loan[] }) {
  if (loans.length === 0) return null;
  return (
    <section id={type === "LEND" ? "ho-no-ban" : "ban-no-ho"} className="scroll-mt-20 space-y-2">
      <h2 className="px-1 text-label text-muted-foreground">
        {loanDirectionHeading(type)} ({loans.length})
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} paymentCount={loan.paymentCount} />
        ))}
      </div>
    </section>
  );
}
