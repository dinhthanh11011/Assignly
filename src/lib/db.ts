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
 * Việc hẹp kiểu này là **thuần kiểu**: hàm dưới đây KHÔNG BAO GIỜ được gọi lúc
 * chạy, nó chỉ tồn tại để `ReturnType<...>` moi ra kiểu client đã hẹp. Client
 * thật export ở cuối file là `PrismaClient` trần.
 *
 * VÌ SAO KHÔNG GỌI `$extends` THẬT. `$extends({ result })` bọc mỗi bản ghi đọc ra
 * trong một `Proxy`, và Proxy đó mang một thuộc tính `Symbol.for("nodejs.util.
 * inspect.custom")` thật sự (Prisma gán nó để `console.log` in ra cả cột computed).
 * React Server Components từ chối đưa một object như thế sang Client Component:
 *
 *     Only plain objects can be passed to Client Components from Server Components.
 *     Objects with symbol properties like nodejs.util.inspect.custom are not supported.
 *
 * Lỗi này nổ ở MỌI chỗ truyền thẳng kết quả truy vấn xuống component `"use client"`,
 * và `{...row}` không chữa được vì spread chép cả symbol. Vì `compute` ở đây chỉ
 * trả lại nguyên giá trị vừa đọc, bỏ phần chạy đi mà giữ phần kiểu là tương đương
 * hoàn toàn về dữ liệu — lại còn bớt một Proxy cho mỗi bản ghi.
 *
 * Ép kiểu ở đây là AN TOÀN vì đường ghi được canh ở phía kia: mọi lần ghi đều đi
 * qua zod `z.enum(...)` dựng từ cùng danh sách trong `src/lib/enums.ts`, nên giá
 * trị lạ không vào được DB. Nếu một ngày có ai ghi tay thẳng vào DB một giá trị
 * ngoài tập, nó vẫn chảy qua đây — đó là cái giá đã biết trước của việc bỏ enum,
 * và cách chặn là đừng sửa tay DB.
 */
// CỐ Ý chỉ dùng làm nguồn kiểu (`ReturnType`), không chỗ nào gọi — xem khối doc ở trên.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function narrowedShape(client: PrismaClient) {
  return client.$extends({
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

/** Kiểu client đã hẹp — xem `narrowedShape`. Không có gì của nó chạy lúc runtime. */
type NarrowedClient = ReturnType<typeof narrowedShape>;

function makeClient(): NarrowedClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  // `narrowedShape` chỉ dùng để lấy kiểu; dữ liệu đọc ra y hệt vì mọi `compute`
  // đều là hàm đồng nhất. Xem khối doc ở trên.
  return client as unknown as NarrowedClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: NarrowedClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
