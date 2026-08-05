# Sổ Thu Chi — Quản lý thu chi, cho vay & thu nợ

Ứng dụng PWA fullstack để ghi chép thu chi hằng ngày, theo dõi các khoản **cho vay /
đi vay** và **thu nợ**, kèm báo cáo dòng tiền. Đăng nhập bằng Google, dùng riêng hoặc
mời người thân cùng ghi chung một **sổ**.

Công nghệ: **Next.js 16 (App Router)**, **PostgreSQL + Prisma**, **Auth.js (Google
OAuth)**, **Tailwind CSS v4** với bộ component kiểu shadcn, **Recharts**, **web-push**
và **service worker PWA** cài được lên điện thoại.

> Không có cron job — mọi thông báo đều phát sinh trực tiếp từ hành động của người
> dùng, và các khoản nợ đến hạn được tính khi tải trang.

## Tính năng

- 🔐 **Đăng nhập Google** (Auth.js / NextAuth v5, phiên JWT)
- 💸 **Thu chi** — ghi khoản thu/chi theo danh mục, ngày, ghi chú; lọc theo tháng và loại
- 🗂️ **Danh mục** — mỗi sổ có bộ danh mục thu/chi riêng (tạo sẵn danh mục thông dụng),
  thêm/sửa/xoá kèm emoji
- 🤝 **Cho vay & đi vay** — số tiền gốc, hạn trả, lãi suất tuỳ chọn; tự chuyển sang
  “đã tất toán” khi thu/trả đủ
- 💰 **Thu nợ / trả nợ** — ghi nhận từng lần thanh toán, xem lịch sử và tiến độ %
- ⏰ **Cảnh báo đến hạn** — nợ quá hạn hoặc sắp đến hạn trong 14 ngày hiện ngay trang chủ
- 📊 **Báo cáo** — dòng tiền 3/6/12 tháng, cơ cấu chi tiêu và nguồn thu theo danh mục
- 👥 **Sổ chung** — mời qua mã/liên kết, duyệt yêu cầu tham gia, phân quyền
  (chủ sổ / quản trị / thành viên)
- 🔔 **Thông báo** trong ứng dụng + web-push khi thành viên khác ghi khoản vay hoặc thu nợ
- 📱 **PWA cài đặt được**, có màn hình ngoại tuyến
- 🎨 Giao diện tiếng Việt, sáng/tối, tối ưu cho điện thoại

## Bắt đầu

### 1. Yêu cầu
- Node 20+
- Docker (để chạy Postgres cục bộ) hoặc một Postgres bất kỳ

### 2. Cài đặt & cấu hình
```bash
npm install
cp .env.example .env
```
Điền `.env`:
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — lấy ở
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
  Redirect URI: `http://localhost:3000/api/auth/callback/google`
- Khoá VAPID — `npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  và `VAPID_PRIVATE_KEY` (chỉ cần nếu muốn bật thông báo đẩy)

### 3. Cơ sở dữ liệu
```bash
docker compose up -d        # Postgres ở :5432
npm run db:push             # đồng bộ schema + sinh Prisma Client
```

### 4. Chạy
```bash
npm run dev                 # http://localhost:3000
```

## Cấu trúc dự án

```
prisma/schema.prisma          Mô hình dữ liệu (Auth.js + sổ/danh mục/giao dịch/khoản vay)
src/lib/
  auth.ts                     Cấu hình Auth.js
  db.ts                       Prisma singleton
  categories.ts               Bộ danh mục mặc định cho sổ mới
  utils.ts                    Định dạng tiền VND, ngày tháng, tháng
  queries.ts                  Truy vấn đọc (tổng quan, giao dịch, khoản vay, báo cáo)
  actions.ts                  Server actions (ghi/sửa/xoá)
  push.ts                     web-push (VAPID) + lưu thông báo trong app
  join.ts                     Yêu cầu tham gia sổ
src/app/
  (app)/                      Khu vực đã đăng nhập: tổng quan, giao dịch, vay nợ,
                              báo cáo, danh mục, sổ chung, cài đặt
  signin/, join/[code]/       Trang đăng nhập & nhận lời mời
  api/auth, api/push          Route handlers
src/components/               UI primitives (ui/) + component nghiệp vụ
public/sw.js, manifest.webmanifest, icons/   Tài nguyên PWA
```

## Ghi chú về dữ liệu

- Số tiền lưu bằng **VND nguyên** (`Float`, không có phần lẻ) — mọi số dương, dấu thu/chi
  nằm ở `Transaction.type`.
- Ngày là **date-only** lưu ở mốc nửa đêm UTC; khi hiển thị luôn ép `timeZone: "UTC"`
  để không lệch một ngày.
- `Loan.status` được đồng bộ tự động sau mỗi lần thêm/xoá thanh toán: đủ gốc → `PAID`,
  còn thiếu → `ACTIVE`. `CANCELLED` chỉ đặt thủ công.
- Xoá danh mục không xoá giao dịch — chúng chuyển thành “Chưa phân loại”.

## Triển khai (Vercel)

1. Đẩy code lên Git và import vào Vercel.
2. Tạo Postgres (Neon, Supabase, Vercel Postgres) và đặt `DATABASE_URL`.
3. Đặt đầy đủ biến môi trường trong project (dùng URL production cho
   `NEXT_PUBLIC_APP_URL` và redirect URI của Google).
4. Chạy migration khi build nếu muốn tự động:
```bash
# "build": "prisma migrate deploy && next build"
```
