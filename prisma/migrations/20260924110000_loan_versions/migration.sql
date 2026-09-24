-- Optimistic locking cho khoản mượn, lần thu/trả và lần đưa tiền — cùng cơ chế
-- với `Transaction.version` (xem 20260923120000_transaction_version).
--
-- Trước đây `updateLoan`, `setLoanStatus`, `updateLoanPayment`,
-- `updateSettlement` và các lệnh xoá tương ứng đều ghi theo `id` trần: hai người
-- cùng sửa một khoản mượn thì bản lưu sau lặng lẽ xoá sửa của bản trước. Từ nay
-- màn hình gửi kèm version nó đã đọc, server ghi bằng
-- `UPDATE ... WHERE id = ? AND version = ?`, 0 dòng nghĩa là đã cũ → từ chối.
--
-- An toàn với dữ liệu đang có: ADD COLUMN với DEFAULT hằng số, Postgres 11+ chỉ
-- ghi vào catalog chứ không viết lại bảng. Mọi dòng cũ bắt đầu từ 0.

-- AlterTable
ALTER TABLE "public"."Loan" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."LoanPayment" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Settlement" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
