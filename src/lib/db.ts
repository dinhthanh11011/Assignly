import { PrismaClient } from "@prisma/client";
import type { GroupRole, JoinRequestStatus, LoanStatus, LoanType, SplitMode, TxType } from "@/lib/enums";

/**
 * GẮN LẠI KIỂU HẸP CHO CÁC CỘT "một trong vài giá trị".
 *
 * Trong DB chúng là `text` (repo này không dùng enum của Postgres — xem AGENTS.md),
 * nên Prisma sinh ra kiểu `string` cho chúng. Để `string` chạy tiếp vào trong app
 * thì mất sạch phần kiểm của TypeScript: `tx.type === "INCOEM"` sẽ biên dịch trót
 * lọt, và một `switch` quên nhánh cũng không ai báo.
 *
 * `$extends({ result })` vá đúng chỗ đó và chỉ chỗ đó: `compute` trả lại NGUYÊN
 * giá trị vừa đọc (không đổi dữ liệu, không thêm truy vấn, không tốn gì lúc chạy),
 * việc duy nhất nó làm là khai với TypeScript rằng cột này thuộc union nào. Từ
 * ranh giới này trở vào, cả app làm việc với union như hồi còn dùng enum.
 *
 * Ép kiểu ở đây là AN TOÀN vì đường ghi được canh ở phía kia: mọi lần ghi đều đi
 * qua zod `z.enum(...)` dựng từ cùng danh sách trong `src/lib/enums.ts`, nên giá
 * trị lạ không vào được DB. Nếu một ngày có ai ghi tay thẳng vào DB một giá trị
 * ngoài tập, nó vẫn chảy qua đây — đó là cái giá đã biết trước của việc bỏ enum,
 * và cách chặn là đừng sửa tay DB.
 */
function makeClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    result: {
      transaction: {
        type: { needs: { type: true }, compute: (t) => t.type as TxType },
        splitMode: {
          needs: { splitMode: true },
          compute: (t) => t.splitMode as SplitMode | null,
        },
      },
      category: {
        type: { needs: { type: true }, compute: (c) => c.type as TxType },
      },
      groupMember: {
        role: { needs: { role: true }, compute: (m) => m.role as GroupRole },
      },
      groupJoinRequest: {
        status: {
          needs: { status: true },
          compute: (r) => r.status as JoinRequestStatus,
        },
      },
      loan: {
        type: { needs: { type: true }, compute: (l) => l.type as LoanType },
        status: { needs: { status: true }, compute: (l) => l.status as LoanStatus },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof makeClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
