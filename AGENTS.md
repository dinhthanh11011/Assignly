<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Không bao giờ dùng enum dưới DB

Mọi cột "một trong vài giá trị" trong repo này là `String`/`TEXT`. Giá trị hợp lệ
được canh ở **tầng server**, không phải ở kiểu dữ liệu của Postgres.

**Quy tắc bất di bất dịch**

- **Không** khai `enum` trong `prisma/schema.prisma`. Dùng `String`, và ghi các
  giá trị hợp lệ vào doc comment `///` ngay trên cột.
- **Không** viết `CREATE TYPE ... AS ENUM` trong migration. Cột mới là `TEXT`.
- Danh sách giá trị hợp lệ chỉ được khai ở **một chỗ**: `src/lib/enums.ts`
  (`TX_TYPES`, `GROUP_ROLES`, `JOIN_REQUEST_STATUSES`, `LOAN_TYPES`,
  `LOAN_STATUSES`, `SPLIT_MODES`). Zod parse từ đó (`z.enum(TX_TYPES)`),
  TypeScript lấy union từ đó, và `src/lib/db.ts` gắn union đó trở lại vào từng
  cột khi đọc ra (`$extends({ result })` — chỉ hẹp kiểu, không đổi dữ liệu,
  không tốn gì lúc chạy).
- **Server action nhận giá trị từ trình duyệt thì phải tự kiểm.** Trước đây kiểu
  enum của DB là chốt chặn cuối; nay không còn. Kiểu của tham số TypeScript chỉ
  ràng buộc người gọi trong repo, còn trình duyệt gọi thẳng vào được với bất cứ
  chuỗi nào — xem `setLoanStatus` / `setMemberRole` để biết cách chặn.

**Vì sao bỏ enum**

- Thêm một giá trị là một lệnh DDL trên bảng thật. `ALTER TYPE ... ADD VALUE`
  **không chạy được trong transaction**, nên một migration hỏng giữa chừng để lại
  kiểu đã sửa mà bảng thì chưa — rồi lần deploy sau chết vì
  `type "X" already exists`. Repo này đã gặp đúng cảnh đó một lần.
- Không xoá được một giá trị enum trong Postgres. Sai một cái tên là phải tạo
  kiểu mới, đổi cột, xoá kiểu cũ — một migration viết lại cả bảng cho một việc
  mà với `TEXT` chỉ là sửa một hằng số trong code.
- Kiểu enum là trạng thái toàn cục nằm ngoài bảng: `pg_dump`/`pg_restore`, dựng
  DB mới, gỡ migration ra… chỗ nào cũng phải nhớ tới nó, và quên là hỏng theo
  cách khó đọc.

**Cái chặn.** `npm run verify` chạy `scripts/check-migrations.sh`, nó fail nếu
`schema.prisma` có khối `enum`, hoặc migration nào (trừ baseline `0_init`) chứa
`AS ENUM`. `0_init` được miễn vì nó đã apply lên prod và tên + checksum nằm
trong `_prisma_migrations` ở đó — sửa file đó là làm `migrate deploy` chết vì
lệch checksum. Các enum trong baseline đã được
`prisma/migrations/20260922130000_enums_to_text/` gỡ đi.

# Cơ sở dữ liệu: mọi thay đổi schema phải có migration

Repo này đã từng trả giá cho việc sửa DB "âm thầm". Prod chạy `prisma db push`
suốt nhiều tháng, thư mục `prisma/migrations/` bị xoá khỏi repo, rồi một lần
`migrate deploy` fail giữa chừng (`type "Role" already exists`) và chặn mọi lần
deploy sau đó. Đừng lặp lại.

**Quy tắc bất di bất dịch**

- Sửa `prisma/schema.prisma` thì **luôn** sinh migration ngay trong cùng một
  thay đổi: `npm run db:migrate -- --name <mo_ta_ngan>`. Commit cả
  `schema.prisma` lẫn thư mục migration mới.
- **Không bao giờ** dùng `prisma db push`. Lệnh `npm run db:push` đã được đổi
  thành lỗi có chủ đích để chặn thói quen này. `db push` sửa DB mà không để lại
  dấu vết nào, và nó sẽ DROP cột đang có data thật (ví dụ
  `Transaction.categoryId`) mà không hỏi.
- **Không bao giờ** chạy `prisma migrate dev` lên prod — nó có quyền reset DB.
  Trên prod chỉ dùng `npm run db:deploy` (`prisma migrate deploy`).
- `prisma/migrations/` phải được commit và không bao giờ bị xoá. Xoá thư mục
  migration khỏi repo trong khi `_prisma_migrations` trên prod vẫn nhớ tên chúng
  là đúng nguyên nhân đã làm hỏng lịch sử lần trước; gỡ ra chỉ có cách baseline
  lại toàn bộ (làm một lần duy nhất, không phải quy trình thường ngày).
- Trước khi sửa gì liên quan tới DB, chạy `npm run db:status` để chắc lịch sử
  local và prod đang khớp nhau.

**`npm run verify` sẽ chặn nếu vi phạm.** `scripts/check-migrations.sh` kiểm:
thư mục migration rỗng, `migration_lock.toml` thiếu provider, và `schema.prisma`
đổi mà không có migration đi kèm. Đặt `SHADOW_DATABASE_URL` (một Postgres dùng
một lần) thì nó kiểm thêm được: chuỗi migration có dựng lại đúng `schema.prisma`
hay không.

**Khi migration fail trên prod.** Đừng sửa tay rồi chạy tiếp. Đọc
`_prisma_migrations` xem `applied_steps_count`: bằng `0` nghĩa là chưa có gì
được apply → `prisma migrate resolve --rolled-back <ten_migration>`, sửa file
SQL rồi deploy lại. Lớn hơn `0` nghĩa là DB đã bị sửa một phần → phải hoàn tác
tay phần đó trước.

**Dựng DB mới từ prod.** Baseline hiện tại là `prisma/migrations/0_init/`, được
sinh thẳng từ schema prod (`prisma migrate diff --from-empty --to-url`), nên nó
phản ánh đúng prod chứ không phải `schema.prisma`. Clone bằng
`pg_dump -Fc` → `pg_restore`; bản dump mang theo cả `_prisma_migrations` nên DB
mới sẽ ở đúng trạng thái đã baseline.
