import { prisma } from "@/lib/db";
import { resolveOccurrences, dateFromKey, DEFAULT_WINDOW_DAYS } from "@/lib/occurrences";

/** Load a task with the context needed to resolve its days, or throw. */
async function loadTaskContext(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { members: true } }, rules: true },
  });
  if (!task) throw new Error("Task not found");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const until = new Date(today.getTime() + DEFAULT_WINDOW_DAYS * 86_400_000);
  const overrides = await prisma.taskOccurrence.findMany({
    where: { taskId, date: { gte: today, lte: until } },
  });
  const occurrences = resolveOccurrences(task, task.rules, overrides, today, until);
  const memberIds = task.group.members.map((m) => m.userId);
  return { task, memberIds, occurrences };
}

/** Persist an assignment for one day as a sparse override. */
async function pinAssignee(taskId: string, dateKey: string, assigneeId: string) {
  const date = dateFromKey(dateKey);
  await prisma.taskOccurrence.upsert({
    where: { taskId_date: { taskId, date } },
    update: { assigneeSet: true, assigneeId, status: "ASSIGNED" },
    create: { taskId, date, assigneeSet: true, assigneeId, status: "ASSIGNED" },
  });
}

/**
 * Randomly assign a member to each targeted day of a task, balancing load: the
 * member with the fewest current assignments for this task is picked (ties
 * broken randomly). Without `dates`, only unassigned future days are filled;
 * with `dates`, those days are (re)assigned, skipping ones already done.
 */
export async function randomAssignTask(taskId: string, dates?: string[]) {
  const { memberIds, occurrences } = await loadTaskContext(taskId);
  if (memberIds.length === 0) return { assigned: 0 };

  const wanted = dates?.length ? new Set(dates) : null;
  const targets = occurrences.filter((o) =>
    wanted ? wanted.has(o.dateKey) && o.status !== "DONE" : o.status === "PENDING"
  );

  // Seed the load counter with current assignments across the window.
  const load = new Map<string, number>(memberIds.map((id) => [id, 0]));
  for (const o of occurrences) {
    if (o.assigneeId && load.has(o.assigneeId)) load.set(o.assigneeId, (load.get(o.assigneeId) ?? 0) + 1);
  }

  let assigned = 0;
  for (const occ of targets) {
    const min = Math.min(...memberIds.map((id) => load.get(id) ?? 0));
    const candidates = memberIds.filter((id) => (load.get(id) ?? 0) === min);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    await pinAssignee(taskId, occ.dateKey, picked);
    load.set(picked, (load.get(picked) ?? 0) + 1);
    assigned++;
  }
  return { assigned };
}

/** Randomly assign a single day of a task to a group member. */
export async function randomAssignOccurrence(taskId: string, dateKey: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { members: true } } },
  });
  if (!task) throw new Error("Task not found");
  const memberIds = task.group.members.map((m) => m.userId);
  if (memberIds.length === 0) return null;
  const picked = memberIds[Math.floor(Math.random() * memberIds.length)];
  await pinAssignee(taskId, dateKey, picked);
  return picked;
}
