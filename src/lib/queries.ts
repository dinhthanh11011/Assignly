import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  resolveOccurrences,
  DEFAULT_WINDOW_DAYS,
  type EffectiveOccurrence,
} from "@/lib/occurrences";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

export type ResolvedOccurrence = EffectiveOccurrence & {
  assignee: U | null;
  task: {
    id: string;
    title: string;
    group: { id: string; name: string };
    unassignedReminderTime: string | null;
    doReminderTime: string | null;
  };
};

/**
 * Expand the tasks matching `where` into their effective days over [from, until],
 * merging assignment rules and sparse overrides, with assignee users attached.
 */
async function resolveTaskOccurrences(
  where: Prisma.TaskWhereInput,
  from: Date,
  until: Date
): Promise<ResolvedOccurrence[]> {
  const tasks = await prisma.task.findMany({
    where,
    include: {
      group: { select: { id: true, name: true } },
      rules: true,
      occurrences: { where: { date: { gte: from, lte: until } } },
    },
  });

  const flat = tasks.flatMap((task) =>
    resolveOccurrences(task, task.rules, task.occurrences, from, until).map((occ) => ({
      ...occ,
      task: {
        id: task.id,
        title: task.title,
        group: task.group,
        unassignedReminderTime: task.unassignedReminderTime,
        doReminderTime: task.doReminderTime,
      },
    }))
  );

  // Attach assignee users in a single lookup.
  const assigneeIds = [...new Set(flat.map((o) => o.assigneeId).filter((id): id is string => !!id))];
  const users = assigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, image: true, email: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return flat.map((o) => ({ ...o, assignee: o.assigneeId ? userById.get(o.assigneeId) ?? null : null }));
}

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
      joinRequests: {
        where: { status: "PENDING" },
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
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

  // Resolve every day across the user's groups within the next week, then slice.
  const all = await resolveTaskOccurrences({ groupId: { in: groupIds } }, today, in7);
  all.sort((a, b) => a.date.getTime() - b.date.getTime());

  const today_ = all.filter((o) => o.date >= today && o.date < tomorrow);
  const unassigned = all.filter((o) => o.status === "PENDING" && !o.assigneeId);
  const mine = all.filter((o) => o.status === "ASSIGNED" && o.assigneeId === userId);

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
  const until = new Date(today.getTime() + DEFAULT_WINDOW_DAYS * 86_400_000);
  const overrides = await prisma.taskOccurrence.findMany({
    where: { taskId, date: { gte: today, lte: until } },
  });

  const memberById = new Map(task.group.members.map((m) => [m.userId, m.user]));
  const occurrences = resolveOccurrences(task, task.rules, overrides, today, until)
    .slice(0, 60)
    .map((o) => ({ ...o, assignee: o.assigneeId ? memberById.get(o.assigneeId) ?? null : null }));

  return { task, occurrences };
}

export const NOTIFICATIONS_PAGE_SIZE = 15;

/**
 * A page of the user's notifications (read and unread), newest first, using
 * id-based cursor pagination. Pass the previous page's `nextCursor` to continue;
 * `nextCursor` is null when there are no more.
 */
export async function getNotifications(userId: string, cursor?: string) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATIONS_PAGE_SIZE + 1, // fetch one extra to detect "has more"
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > NOTIFICATIONS_PAGE_SIZE;
  const items = hasMore ? rows.slice(0, NOTIFICATIONS_PAGE_SIZE) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Report metrics for a group over a date range. */
export async function getGroupReport(userId: string, groupId: string, days = 30) {
  const membership = await getMembership(userId, groupId);
  if (!membership) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const from = new Date(today.getTime() - days * 86_400_000);

  const [occurrences, members] = await Promise.all([
    resolveTaskOccurrences({ groupId }, from, today),
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
