import { prisma } from "@/lib/db";

/** Groups the user belongs to, with member + task counts. */
export async function getMyGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { members: true, tasks: true } },
      members: {
        take: 5,
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMembership(userId: string, groupId: string) {
  return prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
}

export async function getGroupDetail(userId: string, groupId: string) {
  const membership = await getMembership(userId, groupId);
  if (!membership) return null;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invites: { orderBy: { createdAt: "desc" }, take: 1 },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { occurrences: true } } },
      },
    },
  });
  return group ? { group, membership } : null;
}

/** Today's occurrences across all the user's groups, plus what is assigned to them. */
export async function getDashboard(userId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const in7 = new Date(today.getTime() + 7 * 86_400_000);

  const groupIds = (
    await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
  ).map((g) => g.groupId);

  const baseInclude = {
    task: { include: { group: { select: { id: true, name: true } } } },
    assignee: { select: { id: true, name: true, image: true, email: true } },
  } as const;

  const [today_, unassigned, mine] = await Promise.all([
    prisma.taskOccurrence.findMany({
      where: { task: { groupId: { in: groupIds } }, date: { gte: today, lt: tomorrow } },
      include: baseInclude,
      orderBy: { date: "asc" },
    }),
    prisma.taskOccurrence.findMany({
      where: {
        task: { groupId: { in: groupIds } },
        assigneeId: null,
        status: "PENDING",
        date: { gte: today, lt: in7 },
      },
      include: baseInclude,
      orderBy: { date: "asc" },
    }),
    prisma.taskOccurrence.findMany({
      where: {
        assigneeId: userId,
        status: "ASSIGNED",
        date: { gte: today, lt: in7 },
      },
      include: baseInclude,
      orderBy: { date: "asc" },
    }),
  ]);

  return { today: today_, unassigned, mine };
}

export async function getTaskDetail(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      group: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, image: true, email: true } } },
          },
        },
      },
      rules: {
        include: { assignee: { select: { id: true, name: true, image: true, email: true } } },
      },
    },
  });
  if (!task) return null;
  const isMember = task.group.members.some((m) => m.userId === userId);
  if (!isMember) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const occurrences = await prisma.taskOccurrence.findMany({
    where: { taskId, date: { gte: today } },
    include: { assignee: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { date: "asc" },
    take: 60,
  });
  return { task, occurrences };
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/** Report metrics for a group over a date range. */
export async function getGroupReport(userId: string, groupId: string, days = 30) {
  const membership = await getMembership(userId, groupId);
  if (!membership) return null;

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - days);

  const [occurrences, members] = await Promise.all([
    prisma.taskOccurrence.findMany({
      where: { task: { groupId }, date: { gte: from } },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const byStatus = { PENDING: 0, ASSIGNED: 0, DONE: 0, MISSED: 0 };
  const perMember = new Map<string, { name: string; assigned: number; done: number; missed: number }>();
  for (const m of members) {
    perMember.set(m.userId, {
      name: m.user.name || m.user.email || "Unknown",
      assigned: 0,
      done: 0,
      missed: 0,
    });
  }

  for (const o of occurrences) {
    byStatus[o.status]++;
    if (o.assigneeId && perMember.has(o.assigneeId)) {
      const entry = perMember.get(o.assigneeId)!;
      entry.assigned++;
      if (o.status === "DONE") entry.done++;
      if (o.status === "MISSED") entry.missed++;
    }
  }

  const total = occurrences.length;
  const completionRate = total ? Math.round((byStatus.DONE / total) * 100) : 0;

  return {
    total,
    completionRate,
    byStatus,
    perMember: Array.from(perMember.values()).sort((a, b) => b.assigned - a.assigned),
    days,
  };
}
