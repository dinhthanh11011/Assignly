-- Bộ đếm "sổ vừa đổi" cho LiveRefresh, thay cho dấu vân tay cũ.
--
-- Trước đây mỗi nhịp hỏi (20s/tab) chạy bốn phép cộng dồn trên cả sổ: đếm giao
-- dịch + tổng `version`, đếm khoản vay + tổng tiền, đếm lần trả, đếm tất toán +
-- tổng tiền. Tổng `version` không trả lời được từ index nên Postgres đọc hết mọi
-- dòng của sổ mỗi lần hỏi. Dấu vân tay đó còn bỏ sót: xoá một khoản rồi thêm một
-- khoản (cùng số đếm, cùng tổng version), sửa số tiền một lần trả, đổi trạng
-- thái khoản vay, xoá loại (cascade gỡ nhãn mà không tăng version)…
--
-- Nay mọi action ghi dữ liệu của sổ tăng `revision` lên 1, và câu hỏi chỉ còn
-- là một lần đọc theo khoá chính.
--
-- An toàn với dữ liệu đang có: ADD COLUMN với DEFAULT hằng số, Postgres 11+ chỉ
-- ghi vào catalog chứ không viết lại bảng.

-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

-- Phân trang thông báo đi theo (userId, createdAt DESC); trước chỉ có
-- (userId, readAt) nên mỗi trang phải sắp lại toàn bộ thông báo của người đó.
-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");
