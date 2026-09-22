import { cache } from "react";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/action-result";

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

/**
 * Ném lỗi nếu không có phiên đăng nhập; trả về id người dùng.
 *
 * `AppError` chứ không phải `Error`: phiên hết hạn là chuyện người dùng gặp thật
 * và tự sửa được (tải lại trang để đăng nhập lại), nên câu này phải tới được
 * họ — xem `src/lib/action-result.ts`. Bản cũ ném "UNAUTHENTICATED", một chuỗi
 * mà production còn redact đi nữa, nên người dùng chỉ thấy một toast đỏ tiếng
 * Anh không nói lên điều gì.
 */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new AppError("Phiên đăng nhập đã hết hạn. Hãy tải lại trang rồi thử lại.");
  }
  return session.user.id;
}
