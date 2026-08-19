#!/usr/bin/env bash
# Bảo vệ lịch sử migration của Prisma.
#
# Prod từng hỏng đúng vì thiếu cái này: schema đổi bằng `prisma db push` suốt
# nhiều tháng, thư mục migration bị xoá khỏi repo, rồi một lần `migrate deploy`
# fail giữa chừng và chặn mọi lần deploy sau đó. Mỗi thay đổi schema PHẢI đi
# kèm một migration được commit — không có ngoại lệ.
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="${1:-HEAD}"
MIG_DIR=prisma/migrations
fail=0

say_ok()   { echo "✓ $1"; }
say_fail() { echo "✗ $1"; fail=1; }

# 1. Mọi thư mục migration phải có migration.sql. Thư mục rỗng làm
#    `migrate deploy` chết ngay từ bước đọc thư mục.
empty=$(find "$MIG_DIR" -mindepth 1 -maxdepth 1 -type d ! -exec test -f '{}/migration.sql' \; -print 2>/dev/null)
if [ -n "$empty" ]; then
  say_fail "Có thư mục migration không chứa migration.sql"
  echo "$empty" | sed 's/^/    /'
else
  say_ok "Mọi thư mục migration đều có migration.sql"
fi

# 2. migration_lock.toml phải tồn tại và khai đúng provider.
if grep -q '^provider *= *"postgresql"' "$MIG_DIR/migration_lock.toml" 2>/dev/null; then
  say_ok "migration_lock.toml khai provider = \"postgresql\""
else
  say_fail "$MIG_DIR/migration_lock.toml thiếu hoặc sai provider"
fi

# 3. Sửa schema.prisma thì phải có migration mới đi cùng (kể cả file chưa commit).
schema_changed=$(git diff --name-only "$BASE" -- prisma/schema.prisma)
mig_changed=$(git diff --name-only "$BASE" -- "$MIG_DIR"; git ls-files --others --exclude-standard -- "$MIG_DIR")
if [ -n "$schema_changed" ] && [ -z "$mig_changed" ]; then
  say_fail "schema.prisma đổi so với $BASE nhưng không có migration nào kèm theo"
  echo "    Chạy: npm run db:migrate -- --name <mô_tả_ngắn>"
else
  say_ok "schema.prisma và migration đi cùng nhau"
fi

# 4. Nếu có shadow DB thì kiểm luôn: migration đã dựng lại đúng schema.prisma chưa.
#    Không có SHADOW_DATABASE_URL thì bỏ qua — không phải máy nào cũng có Postgres cục bộ.
if [ -n "${SHADOW_DATABASE_URL:-}" ]; then
  if npx prisma migrate diff \
       --from-migrations "$MIG_DIR" \
       --to-schema-datamodel prisma/schema.prisma \
       --shadow-database-url "$SHADOW_DATABASE_URL" \
       --exit-code >/dev/null 2>&1; then
    say_ok "Migration dựng lại đúng schema.prisma"
  else
    say_fail "Migration dựng ra schema khác schema.prisma — thiếu một migration"
  fi
else
  echo "· Bỏ qua đối chiếu migration ↔ schema (chưa đặt SHADOW_DATABASE_URL)"
fi

exit $fail
