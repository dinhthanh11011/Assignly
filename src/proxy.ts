import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Cố ý *không* import `@/lib/auth`: proxy chỉ cần đọc phiên từ JWT, kéo thêm
// PrismaAdapter vào đây là bắt mọi request phải nạp Prisma Client trước.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/signin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // `/api/cron` từng được miễn ở đây, sót lại từ hồi app còn là một app nhắc
  // việc. Không có route nào tên đó, và app cố ý KHÔNG có việc chạy theo lịch
  // (mọi hạn nợ tính lúc tải trang) — nên đó chỉ là một đường không cần đăng
  // nhập trỏ vào chỗ trống, chờ ai đó vô tình tạo file trùng tên. Đã bỏ.
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && pathname === "/signin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Skip static assets, the service worker / manifest, and Auth.js's own routes:
  // running the session fetch on /api/auth/* appends its Set-Cookie headers to the
  // response, which can clobber the state/PKCE cookies the callback route is writing.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|.*\\.png$).*)",
  ],
};
