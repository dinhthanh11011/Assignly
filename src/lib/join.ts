import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/push";
import { getMembership } from "@/lib/queries";

/**
 * Record a pending request for `userId` to join `groupId` and notify the
 * group's owner/admins. Returns "member" if they already belong (no request
 * created), otherwise "requested". Callers are responsible for validating the
 * invite and for any cache revalidation.
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
  const who = requester?.name || requester?.email || "Someone";
  await Promise.all(
    admins.map((a) =>
      notifyUser(a.userId, "JOIN_REQUEST", {
        title: "New join request",
        body: `${who} wants to join ${group?.name ?? "your group"}. Tap to review.`,
        url: `/groups/${groupId}#join-requests`,
        tag: `join-${groupId}-${userId}`,
        data: { requestId: request.id },
      })
    )
  );
  return "requested";
}
