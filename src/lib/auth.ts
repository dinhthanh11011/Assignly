import { cache } from "react";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";

// Cấu hình đầy đủ (có DB) — dùng trong app. Proxy dùng bản không DB ở
// `@/lib/auth.config` để không phải nạp Prisma trước mỗi request.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});

/**
 * Phiên đăng nhập của **request hiện tại**, chỉ giải mã JWT một lần dù layout và
 * page cùng hỏi. Mọi server component nên dùng hàm này thay cho `auth()`.
 */
export const getSession = cache(() => auth());

/** Throws if there is no session; returns the authenticated user id. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.user.id;
}
