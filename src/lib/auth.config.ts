import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Phần cấu hình đăng nhập **không đụng tới database**.
 *
 * Tách riêng vì `src/proxy.ts` chạy trước *mọi* request chỉ để đọc phiên từ
 * JWT — nếu nó import `@/lib/auth` thì kéo theo cả PrismaAdapter và Prisma
 * Client vào bundle của proxy, làm mỗi lần khởi động nguội (rất hay gặp trên
 * Vercel) phải nạp thêm cả engine chẳng bao giờ dùng tới.
 *
 * Adapter (cần DB, chỉ dùng lúc đăng nhập bằng Google) được ghép thêm ở
 * `@/lib/auth`.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/signin",
    // Không có trang này, mọi lỗi OAuth rơi về /api/auth/error và trả 500.
    error: "/signin",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
