-- Trang quản trị toàn hệ thống (/admin).
--
-- Chỉ thêm cột và index: ADD COLUMN có DEFAULT hằng số không bắt Postgres 11+
-- viết lại bảng, và cả ba cột đều nullable hoặc có mặc định nên dữ liệu cũ
-- không cần vá. Không xoá, không đổi kiểu, không đụng khoá ngoại.

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "User_lastSeenAt_idx" ON "public"."User"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Transaction_createdById_createdAt_idx" ON "public"."Transaction"("createdById", "createdAt");
