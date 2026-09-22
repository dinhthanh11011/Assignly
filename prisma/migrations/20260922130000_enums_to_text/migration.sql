-- BỎ HẲN KIỂU enum CỦA POSTGRES: 5 cột enum → text, rồi xoá 5 kiểu đó đi.
--
-- Vì sao: xem mục "Không bao giờ dùng enum dưới DB" trong AGENTS.md. Tóm tắt —
-- thêm một giá trị vào enum là một lệnh DDL chạy trên bảng thật, ALTER TYPE
-- ... ADD VALUE không chạy được trong transaction nên một migration hỏng giữa
-- chừng để lại kiểu đã sửa mà bảng thì chưa, và lần deploy sau chết vì
-- `type "X" already exists` — đúng kiểu hỏng repo này đã gặp một lần rồi.
-- Giá trị hợp lệ từ nay do server canh (src/lib/enums.ts + zod).
--
-- ── KHÔNG MẤT DỮ LIỆU ────────────────────────────────────────────────────────
-- `USING "cột"::text` đổ ra ĐÚNG cái nhãn đang lưu ('OWNER' → 'OWNER'), nên mọi
-- giá trị giữ nguyên từng ký tự; không dòng nào bị đổi, bị null hay bị xoá.
-- Mặc định được gỡ ra trước rồi đặt lại thành hằng chuỗi tương đương, vì
-- Postgres không tự ép mặc định kiểu cũ sang kiểu mới.
-- Các index có sẵn trên mấy cột này (Category_groupId_type_name_key,
-- GroupJoinRequest_groupId_status_idx, Loan_groupId_status_idx) được Postgres tự
-- dựng lại trong cùng lệnh ALTER — không cần đụng tay, và không có khoá ngoại
-- nào trỏ vào chúng.
--
-- ── KHOÁ BẢNG ────────────────────────────────────────────────────────────────
-- Đổi kiểu cột là ACCESS EXCLUSIVE + viết lại bảng. Với cỡ dữ liệu của app này
-- (vài nghìn dòng) là dưới một giây. Cả file chạy trong MỘT transaction của
-- Prisma: hỏng ở bất kỳ lệnh nào thì toàn bộ quay về nguyên trạng, không có
-- trạng thái nửa vời — đây cũng là lý do gom cả 5 kiểu vào một migration thay vì
-- rải ra nhiều lần deploy.

-- GroupMember.role  (Role → text, mặc định 'MEMBER')
ALTER TABLE "public"."GroupMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."GroupMember" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
ALTER TABLE "public"."GroupMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- GroupJoinRequest.status  (JoinRequestStatus → text, mặc định 'PENDING')
ALTER TABLE "public"."GroupJoinRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."GroupJoinRequest" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "public"."GroupJoinRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Category.type và Transaction.type  (TxType → text, không có mặc định)
ALTER TABLE "public"."Category" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
ALTER TABLE "public"."Transaction" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- Loan.type và Loan.status  (LoanType/LoanStatus → text, mặc định 'ACTIVE')
ALTER TABLE "public"."Loan" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
ALTER TABLE "public"."Loan" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Loan" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "public"."Loan" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- Giờ mới xoá được các kiểu: DROP TYPE sẽ báo lỗi nếu còn cột nào dùng tới,
-- nên năm lệnh này cũng chính là phần tự kiểm của migration — chạy trót lọt
-- nghĩa là không còn chỗ nào trong DB đứng trên enum nữa.
DROP TYPE "public"."Role";
DROP TYPE "public"."JoinRequestStatus";
DROP TYPE "public"."TxType";
DROP TYPE "public"."LoanType";
DROP TYPE "public"."LoanStatus";
