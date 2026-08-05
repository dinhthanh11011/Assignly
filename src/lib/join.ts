import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/push";
import { getMembership } from "@/lib/queries";

/**
 * Ghi nhận yêu cầu tham gia sổ của `userId` và báo cho chủ sổ / quản trị viên.
 * Trả về "member" nếu họ đã là thành viên (không tạo yêu cầu), ngược lại
 * "requested". Người gọi tự chịu trách nhiệm kiểm tra mã mời và revalidate.
 */
export async function createJoinRequest(
  userId: string,
  groupId: string
): Promise<"member" | "requested"> {
  const existing = await getMembership(userId, groupId);
  if (existing) return "member";

  const request = await prisma.groupJoinRequest.upsert({
    where: { userId_groupId: { userId, groupId } },
    update: { status: "PENDING", decidedAt: null },
    create: { userId, groupId },
  });

  const [requester, group, admins] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.groupMember.findMany({ where: { groupId, role: { in: ["OWNER", "ADMIN"] } } }),
  ]);
  const who = requester?.name || requester?.email || "Một người dùng";
  await Promise.all(
    admins.map((a) =>
      notifyUser(a.userId, "JOIN_REQUEST", {
        title: "Yêu cầu tham gia sổ",
        body: `${who} muốn tham gia sổ ${group?.name ?? ""}. Chạm để duyệt.`,
        url: `/groups/${groupId}#join-requests`,
        tag: `join-${groupId}-${userId}`,
        data: { requestId: request.id },
      })
    )
  );
  return "requested";
}
