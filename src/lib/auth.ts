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
 * Hồ sơ tài khoản của một người, đọc tươi từ DB — `cache()` để layout, page,
 * `requireUserId` và các chốt quyền quản trị cùng hỏi trong một request vẫn chỉ
 * tốn một lượt đọc theo khoá chính. `admin.ts` export lại nó dưới tên
 * `getAdminUser`; nó nằm ở đây vì `requireUserId` cần nó, mà `admin.ts` đã
 * import từ file này.
 */
export const getUserAccount = cache((userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isAdmin: true,
      disabledAt: true,
    },
  }),
);

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
  // Phiên là JWT nên khoá tài khoản không thu hồi được token nào. Redirect ở
  // `(app)/layout.tsx` chỉ chặn được TRANG; server action và route handler là
  // endpoint riêng, gọi thẳng được, và chúng đều đi qua đúng hàm này.
  const account = await getUserAccount(session.user.id);
  if (!account) {
    throw new AppError("Phiên đăng nhập đã hết hạn. Hãy tải lại trang rồi thử lại.");
  }
  if (account.disabledAt) throw new AppError("Tài khoản của bạn đã bị khoá.");
  return session.user.id;
}
