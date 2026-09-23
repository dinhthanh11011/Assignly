-- Gỡ `Transaction.categoryId` — cột của mô hình CŨ "một khoản một loại".
--
-- BỐI CẢNH. Ngày 05/08/2026 (commit f3a4c27) app đổi sang "một khoản nhiều loại",
-- tức bảng nối `TransactionCategory`; `schema.prisma` bỏ cột này ngay lúc đó
-- nhưng KHÔNG có migration đi kèm — đúng thời kỳ prod chạy `db push`. Cột vì thế
-- nằm lại dưới DB. Ngày 19/08/2026 baseline `0_init` được sinh THẲNG TỪ PROD nên
-- nó chép luôn cột đó vào lịch sử migration.
--
-- Hậu quả là `prisma migrate diff --from-migrations --to-schema-datamodel` luôn
-- báo lệch, tức bước 5 của `scripts/check-migrations.sh` (bước duy nhất bắt được
-- "migration có đó nhưng dựng ra schema khác") vĩnh viễn đỏ vì một lý do cũ —
-- nên không ai bật `SHADOW_DATABASE_URL`, và lần sau lệch thật thì không ai báo.
-- Đó mới là thứ migration này chữa; bản thân cột không gây lỗi lúc chạy.
--
-- AN TOÀN DỮ LIỆU. Ba bước dưới đây chạy trong CÙNG MỘT transaction (Prisma bọc
-- mỗi file migration trong một transaction), nên hoặc cả ba cùng xong, hoặc
-- không gì xảy ra cả:
--
--   1. Vá nốt phần chưa chuyển: khoản nào còn giá trị ở cột cũ mà CHƯA có dòng
--      nào trong bảng mới thì thêm vào, làm loại chính (position = 0).
--   2. Chặn: nếu sau bước 1 vẫn còn khoản mà loại ở cột cũ không xuất hiện trong
--      bảng mới, migration DỪNG LẠI và không drop gì cả.
--   3. Drop khoá ngoại → index → cột.
--
-- Bước 2 cố ý KHÔNG tự sửa trường hợp "khoản đã có loại trong bảng mới, nhưng
-- khác loại ở cột cũ". Ở đó bảng mới là bản đúng — nó là thứ duy nhất app ghi
-- vào từ tháng 8 — còn cột cũ là dấu vết đóng băng từ trước, và tự động thêm nó
-- lại là gắn cho khoản một loại mà người dùng có thể đã cố ý bỏ đi. Việc đó cần
-- người đọc và quyết, không phải một migration đoán.
--
-- Kiểm trên prod ngay trước khi viết file này: 243 khoản, 14 khoản còn giá trị ở
-- cột cũ, cả 14 đều đã có đúng loại đó trong bảng mới ở position 0, 0 khoản chỉ
-- tồn tại ở cột cũ, 0 khoản lệch loại. Nghĩa là bước 1 và 2 dự kiến không đụng
-- dòng nào — chúng ở đây để chuyện đó được CHỨNG MINH lúc apply chứ không phải
-- được tin.
--
-- NẾU BƯỚC 2 DỪNG MIGRATION: không có gì bị sửa (`applied_steps_count` = 0).
-- Chạy `prisma migrate resolve --rolled-back 20260923130000_drop_transaction_category_id`,
-- xem những khoản bị chặn, quyết định rồi deploy lại — xem mục "Khi migration
-- fail trên prod" trong AGENTS.md.

-- MỘT CÂU LỆNH DUY NHẤT. Cả ba bước nằm trong một khối DO, không phải ba lệnh
-- rời — và đó là chủ ý, không phải kiểu viết. Ba lệnh rời chỉ nguyên tử khi thứ
-- chạy chúng có bọc transaction; chạy bằng `psql` (autocommit từng lệnh) thì
-- bước 1 đã ghi xong và ở lại trong DB dù bước 2 chặn ngay sau đó — tức là DB
-- bị sửa bởi một migration được coi là "không chạy". Một khối DO thì hệ nào
-- chạy cũng là một câu, và `RAISE EXCEPTION` trong đó kéo theo cả phần vá.
DO $$
DECLARE con_lai INTEGER;
BEGIN
  -- 1. Vá nốt phần chưa chuyển (khoản còn giá trị ở cột cũ mà chưa có dòng nào
  --    trong bảng mới) — thêm làm loại chính.
  INSERT INTO "public"."TransactionCategory" ("transactionId", "categoryId", "position")
  SELECT t."id", t."categoryId", 0
  FROM "public"."Transaction" t
  WHERE t."categoryId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "public"."TransactionCategory" tc WHERE tc."transactionId" = t."id"
    )
  ON CONFLICT DO NOTHING;

  -- 2. Chặn: không drop khi còn thông tin chỉ tồn tại ở cột cũ.
  SELECT count(*) INTO con_lai
  FROM "public"."Transaction" t
  WHERE t."categoryId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "public"."TransactionCategory" tc
      WHERE tc."transactionId" = t."id" AND tc."categoryId" = t."categoryId"
    );

  IF con_lai > 0 THEN
    RAISE EXCEPTION
      'Dung: % khoan co loai o cot cu Transaction."categoryId" ma bang TransactionCategory khong co. Xem chung truoc khi drop cot.', con_lai;
  END IF;

  -- 3. Gỡ cột cùng khoá ngoại và index của nó.
  ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_categoryId_fkey";
  DROP INDEX "public"."Transaction_categoryId_idx";
  ALTER TABLE "public"."Transaction" DROP COLUMN "categoryId";
END $$;
