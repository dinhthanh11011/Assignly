import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  resolveOccurrences,
  dateFromKey,
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

const taskContextInclude = {
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
} satisfies Prisma.TaskInclude;

type TaskWithContext = Prisma.TaskGetPayload<{ include: typeof taskContextInclude }>;

export async function getTaskDetail(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskContextInclude,
  });
  if (!task) return null;
  const isMember = task.group.members.some((m) => m.userId === userId);
  if (!isMember) return null;

  const page = await resolveTaskPage(task, null, TASK_OCCURRENCE_PAGE_SIZE);
  return { task, ...page };
}

export const TASK_OCCURRENCE_PAGE_SIZE = 60;
const SCAN_CHUNK_DAYS = 120;
const MAX_SCAN_DAYS = 366 * 2;

export type TaskOccurrenceView = ResolvedOccurrence;

export type TaskOccurrencePage = {
  occurrences: TaskOccurrenceView[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Resolve one page of a task's virtual days starting after `afterDateKey`
 * (exclusive; null = from today). Recurrences are unbounded, so we scan the
 * schedule in chunks until we have `limit + 1` days (to detect "has more") or
 * reach a sane far-future horizon for finite/sparse schedules.
 */
async function resolveTaskPage(
  task: TaskWithContext,
  afterDateKey: string | null,
  limit: number
): Promise<TaskOccurrencePage> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const from = afterDateKey
    ? new Date(dateFromKey(afterDateKey).getTime() + 86_400_000)
    : today;
  const maxUntil = new Date(from.getTime() + MAX_SCAN_DAYS * 86_400_000);

  // Overrides are sparse — pull all of them from the cursor onward once.
  const overrides = await prisma.taskOccurrence.findMany({
    where: { taskId: task.id, date: { gte: from } },
  });
  const memberById = new Map(task.group.members.map((m) => [m.userId, m.user]));

  const collected: EffectiveOccurrence[] = [];
  let windowStart = from;
  while (collected.length <= limit && windowStart <= maxUntil) {
    const windowEnd = new Date(
      Math.min(windowStart.getTime() + SCAN_CHUNK_DAYS * 86_400_000, maxUntil.getTime())
    );
    collected.push(...resolveOccurrences(task, task.rules, overrides, windowStart, windowEnd));
    windowStart = new Date(windowEnd.getTime() + 86_400_000);
  }

  const hasMore = collected.length > limit;
  const occurrences = collected.slice(0, limit).map((o) => ({
    ...o,
    assignee: o.assigneeId ? memberById.get(o.assigneeId) ?? null : null,
    task: {
      id: task.id,
      title: task.title,
      group: { id: task.group.id, name: task.group.name },
      unassignedReminderTime: task.unassignedReminderTime,
      doReminderTime: task.doReminderTime,
    },
  }));
  const nextCursor = hasMore && occurrences.length ? occurrences[occurrences.length - 1].dateKey : null;
  return { occurrences, nextCursor, hasMore };
}

/** A page of a task's upcoming days for "load more". Returns null if not a member. */
export async function getTaskOccurrencePage(
  userId: string,
  taskId: string,
  afterDateKey: string | null,
  limit = TASK_OCCURRENCE_PAGE_SIZE
): Promise<TaskOccurrencePage | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskContextInclude,
  });
  if (!task) return null;
  if (!task.group.members.some((m) => m.userId === userId)) return null;
  return resolveTaskPage(task, afterDateKey, limit);
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

  // JOIN_REQUEST notifications carry quick actions (approve/reject). The
  // notification row itself has no "handled" state — that lives on the
  // GroupJoinRequest — so fold the request's current status into the payload
  // so the client can hide the actions once it's no longer PENDING.
  const requestIds = items
    .filter((n) => n.type === "JOIN_REQUEST")
    .map((n) => (n.payload as { data?: { requestId?: string } })?.data?.requestId)
    .filter((id): id is string => Boolean(id));

  if (requestIds.length > 0) {
    const requests = await prisma.groupJoinRequest.findMany({
      where: { id: { in: requestIds } },
      select: { id: true, status: true },
    });
    const statusById = new Map(requests.map((r) => [r.id, r.status]));
    for (const n of items) {
      if (n.type !== "JOIN_REQUEST") continue;
      const payload = (n.payload ?? {}) as { data?: { requestId?: string } };
      const requestId = payload.data?.requestId;
      if (!requestId) continue;
      n.payload = {
        ...payload,
        data: { ...payload.data, requestStatus: statusById.get(requestId) ?? null },
      };
    }
  }

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
