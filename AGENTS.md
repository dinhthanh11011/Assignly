<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
