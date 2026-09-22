-- Ghi lại KIỂU CHIA người dùng đã chọn ở form (chia đều / theo phần / tự nhập).
--
-- Các dòng TransactionSplit chỉ mang weight và amount, nên "theo phần: A 1 phần,
-- B 0 phần" ghi xuống y hệt "chia đều, chỉ mình A" — mở lại để sửa thì form đoán
-- sai ô đã chọn. Cột này chỉ để nhớ lựa chọn đó; phép chia tiền vẫn đọc weight
-- và amount như cũ.
--
-- TEXT chứ không phải enum: xem mục "Không bao giờ dùng enum dưới DB" trong
-- AGENTS.md. Giá trị hợp lệ ("EQUAL" | "WEIGHT" | "EXACT") được canh ở server,
-- trong src/lib/enums.ts.
--
-- An toàn với dữ liệu đang có: chỉ ADD COLUMN, nullable, không DEFAULT — Postgres
-- 11+ không viết lại bảng, mọi dòng cũ nhận NULL, và NULL ở cột này nghĩa là
-- "khoản ghi trước khi có cột", khi đó form đoán lại từ các dòng split như trước.

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN "splitMode" TEXT;
