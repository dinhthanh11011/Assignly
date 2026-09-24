import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * `Group.revision` — bộ đếm "sổ vừa đổi" mà `LiveRefresh` hỏi định kỳ.
 *
 * Gọi SAU khi đã ghi xong, và ở MỌI chỗ ghi dữ liệu mà màn hình của sổ hiện ra:
 * giao dịch, khoản vay, lần trả, tất toán, loại, thành viên, tên sổ. Quên một
 * chỗ thì người khác trong sổ không thấy thay đổi đó cho tới khi tự tải lại.
 * Đổi sổ đang ghim (`setActiveGroup`) KHÔNG phải thay đổi dữ liệu, đừng gọi.
 *
 * `updateMany` chứ không phải `update`: sổ vừa bị xoá thì đây là no-op, không ném.
 */
export async function bumpGroupRevision(groupId: string) {
  await prisma.group.updateMany({
    where: { id: groupId },
    data: { revision: { increment: 1 } },
  });
}

/**
 * Revision của sổ ở lần dựng trang này. `cache()` vì một trang có thể đặt nhiều
 * chỗ cần nó. KHÔNG tự kiểm quyền — chỉ dùng với `groupId` trang đã kiểm.
 */
export const getGroupRevision = cache(async (groupId: string) => {
  const g = await prisma.group.findUnique({ where: { id: groupId }, select: { revision: true } });
  return g?.revision ?? 0;
});
